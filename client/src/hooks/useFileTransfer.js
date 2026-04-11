import { useState, useCallback, useRef } from 'react';
import { CHUNK_SIZE, MAX_P2P_FILE_SIZE, MAX_SERVER_FILE_SIZE, SERVER_URL } from '../utils/constants';
import { TRANSFER_STATES } from '../utils/constants';

/**
 * File transfer hook — handles chunked P2P transfer and server fallback.
 */
export function useFileTransfer() {
  const [progress, setProgress] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(null);
  const [transferState, setTransferState] = useState(TRANSFER_STATES.IDLE);
  const [currentFile, setCurrentFile] = useState(null);
  const [receivedFiles, setReceivedFiles] = useState([]);

  const receiverBufferRef = useRef([]);
  const receiverMetaRef = useRef(null);
  const receivedBytesRef = useRef(0);
  const startTimeRef = useRef(null);

  /**
   * SENDER: Send files via WebRTC DataChannel.
   */
  const sendFilesP2P = useCallback(async (files, dataChannel, onFileComplete) => {
    if (!dataChannel || dataChannel.readyState !== 'open') {
      throw new Error('DataChannel not open');
    }

    for (let fileIdx = 0; fileIdx < files.length; fileIdx++) {
      const file = files[fileIdx];

      if (file.size > MAX_P2P_FILE_SIZE) {
        continue;
      }

      setCurrentFile({ name: file.name, size: file.size, index: fileIdx, total: files.length });
      setTransferState(TRANSFER_STATES.SENDING);
      setProgress(0);

      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      // Send metadata header
      const meta = JSON.stringify({
        type: 'file-meta',
        name: file.name,
        size: file.size,
        mimeType: file.type,
        totalChunks,
        fileIndex: fileIdx,
        totalFiles: files.length,
      });
      dataChannel.send(meta);

      // Send chunks
      let offset = 0;
      let chunkIndex = 0;
      startTimeRef.current = Date.now();

      const sendNextChunk = () => {
        return new Promise((resolve) => {
          const sendChunk = () => {
            while (offset < file.size) {
              // Backpressure check
              if (dataChannel.bufferedAmount > CHUNK_SIZE * 8) {
                dataChannel.onbufferedamountlow = () => {
                  dataChannel.onbufferedamountlow = null;
                  sendChunk();
                };
                return;
              }

              const end = Math.min(offset + CHUNK_SIZE, file.size);
              const chunk = file.slice(offset, end);

              chunk.arrayBuffer().then((buffer) => {
                if (dataChannel.readyState === 'open') {
                  dataChannel.send(buffer);
                }

                chunkIndex++;
                offset = end;
                const pct = Math.round((offset / file.size) * 100);
                setProgress(pct);

                // Calculate speed + ETA
                const elapsed = (Date.now() - startTimeRef.current) / 1000;
                if (elapsed > 0) {
                  const currentSpeed = offset / elapsed;
                  setSpeed(currentSpeed);
                  const remaining = (file.size - offset) / currentSpeed;
                  setTimeRemaining(remaining);
                }

                if (offset >= file.size) {
                  // Send end marker
                  dataChannel.send(JSON.stringify({ type: 'file-end', name: file.name }));
                  resolve();
                } else {
                  sendChunk();
                }
              });
              return; // Wait for arrayBuffer promise
            }
            resolve();
          };
          sendChunk();
        });
      };

      await sendNextChunk();

      // Small delay between files
      if (fileIdx < files.length - 1) {
        await new Promise((r) => setTimeout(r, 100));
      }

      onFileComplete?.(file);
    }

    setTransferState(TRANSFER_STATES.COMPLETE);
    setProgress(100);
    setTimeout(() => {
      setTransferState(TRANSFER_STATES.IDLE);
      setCurrentFile(null);
      setProgress(0);
      setSpeed(0);
      setTimeRemaining(null);
    }, 3000);
  }, []);

  /**
   * RECEIVER: Handle incoming data on DataChannel.
   */
  const handleIncomingData = useCallback((data) => {
    // String data = metadata
    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data);

        if (msg.type === 'file-meta') {
          receiverMetaRef.current = msg;
          receiverBufferRef.current = [];
          receivedBytesRef.current = 0;
          startTimeRef.current = Date.now();
          setCurrentFile({ name: msg.name, size: msg.size, index: msg.fileIndex, total: msg.totalFiles });
          setTransferState(TRANSFER_STATES.RECEIVING);
          setProgress(0);
          return;
        }

        if (msg.type === 'file-end') {
          const meta = receiverMetaRef.current;
          if (meta) {
            const blob = new Blob(receiverBufferRef.current, { type: meta.mimeType });
            const url = URL.createObjectURL(blob);

            const newFile = {
              id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
              name: meta.name,
              size: meta.size,
              mimeType: meta.mimeType,
              blob,
              url,
              receivedAt: Date.now(),
            };

            setReceivedFiles((prev) => [...prev, newFile]);
            setTransferState(TRANSFER_STATES.COMPLETE);
            setProgress(100);

            setTimeout(() => {
              setTransferState(TRANSFER_STATES.IDLE);
              setCurrentFile(null);
              setProgress(0);
              setSpeed(0);
              setTimeRemaining(null);
            }, 2000);
          }

          receiverMetaRef.current = null;
          receiverBufferRef.current = [];
          receivedBytesRef.current = 0;
          return;
        }
      } catch {
        // Not JSON, ignore
      }
      return;
    }

    // ArrayBuffer data = file chunk
    if (data instanceof ArrayBuffer) {
      receiverBufferRef.current.push(data);
      receivedBytesRef.current += data.byteLength;

      const meta = receiverMetaRef.current;
      if (meta) {
        const pct = Math.round((receivedBytesRef.current / meta.size) * 100);
        setProgress(pct);

        const elapsed = (Date.now() - startTimeRef.current) / 1000;
        if (elapsed > 0) {
          const currentSpeed = receivedBytesRef.current / elapsed;
          setSpeed(currentSpeed);
          const remaining = (meta.size - receivedBytesRef.current) / currentSpeed;
          setTimeRemaining(remaining);
        }
      }
    }
  }, []);

  /**
   * FALLBACK: Upload files to server.
   */
  const sendFilesServer = useCallback(async (files, roomId, onProgress) => {
    setTransferState(TRANSFER_STATES.SENDING);
    setProgress(0);

    const formData = new FormData();
    for (const file of files) {
      if (file.size > MAX_SERVER_FILE_SIZE) {
        continue;
      }
      formData.append('files', file);
    }

    try {
      const xhr = new XMLHttpRequest();

      const uploadPromise = new Promise((resolve, reject) => {
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) {
            const pct = Math.round((e.loaded / e.total) * 100);
            setProgress(pct);
            onProgress?.(pct);
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(JSON.parse(xhr.responseText));
          } else {
            reject(new Error(`Upload failed: ${xhr.status}`));
          }
        };

        xhr.onerror = () => reject(new Error('Upload failed'));
      });

      xhr.open('POST', `${SERVER_URL}/api/upload/${roomId}`);
      xhr.send(formData);

      const result = await uploadPromise;
      setTransferState(TRANSFER_STATES.COMPLETE);
      setProgress(100);

      setTimeout(() => {
        setTransferState(TRANSFER_STATES.IDLE);
        setProgress(0);
      }, 3000);

      return result;
    } catch (err) {
      setTransferState(TRANSFER_STATES.ERROR);
      throw err;
    }
  }, []);

  /**
   * Download a file received from server fallback.
   */
  const downloadServerFile = useCallback(async (roomId, fileId, fileName) => {
    const response = await fetch(`${SERVER_URL}/api/download/${roomId}/${fileId}`);
    if (!response.ok) throw new Error('Download failed');

    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, []);

  /**
   * Trigger download for a received P2P file.
   */
  const downloadFile = useCallback((file) => {
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, []);

  const clearReceivedFiles = useCallback(() => {
    receivedFiles.forEach((f) => {
      if (f.url) URL.revokeObjectURL(f.url);
    });
    setReceivedFiles([]);
  }, [receivedFiles]);

  return {
    progress,
    speed,
    timeRemaining,
    transferState,
    currentFile,
    receivedFiles,
    sendFilesP2P,
    sendFilesServer,
    handleIncomingData,
    downloadFile,
    downloadServerFile,
    clearReceivedFiles,
  };
}
