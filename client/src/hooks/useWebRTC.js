import { useRef, useCallback, useState } from 'react';
import { ICE_SERVERS, BUFFERED_AMOUNT_LOW_THRESHOLD } from '../utils/constants';

/**
 * WebRTC peer connection hook.
 * Manages RTCPeerConnection, DataChannel, and ICE signaling.
 */
export function useWebRTC({ onDataChannel, onConnectionStateChange, sendSignal }) {
  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const [connectionState, setConnectionState] = useState('new');
  const pendingCandidatesRef = useRef([]);

  const createPeerConnection = useCallback((peerId) => {
    // Clean up existing connection
    if (pcRef.current) {
      pcRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcRef.current = pc;

    // ICE candidate handling
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal(peerId, {
          type: 'ice-candidate',
          candidate: event.candidate,
        });
      }
    };

    // Connection state monitoring
    pc.onconnectionstatechange = () => {
      const state = pc.connectionState;
      setConnectionState(state);
      onConnectionStateChange?.(state);
    };

    pc.oniceconnectionstatechange = () => {
      // ICE state changes handled silently in production
    };

    // Handle incoming data channel (receiver side)
    pc.ondatachannel = (event) => {
      dcRef.current = event.channel;
      setupDataChannel(event.channel);
      onDataChannel?.(event.channel);
    };

    return pc;
  }, [sendSignal, onDataChannel, onConnectionStateChange]);

  const setupDataChannel = useCallback((channel) => {
    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = BUFFERED_AMOUNT_LOW_THRESHOLD;
  }, []);

  // Host creates offer + data channel
  const createOffer = useCallback(async (peerId) => {
    const pc = createPeerConnection(peerId);

    // Create data channel BEFORE offer
    const dc = pc.createDataChannel('fileTransfer', {
      ordered: true,
    });
    dcRef.current = dc;
    setupDataChannel(dc);
    onDataChannel?.(dc);

    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    sendSignal(peerId, {
      type: 'offer',
      sdp: pc.localDescription,
    });
  }, [createPeerConnection, setupDataChannel, sendSignal, onDataChannel]);

  // Guest receives offer, sends answer
  const handleSignal = useCallback(async (data) => {
    const { from, signal } = data;

    if (signal.type === 'offer') {
      const pc = createPeerConnection(from);
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

      // Apply any pending candidates
      for (const candidate of pendingCandidatesRef.current) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      }
      pendingCandidatesRef.current = [];

      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      sendSignal(from, {
        type: 'answer',
        sdp: pc.localDescription,
      });
    }

    if (signal.type === 'answer') {
      if (pcRef.current && pcRef.current.signalingState === 'have-local-offer') {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        
        // Apply any pending candidates
        for (const candidate of pendingCandidatesRef.current) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
        pendingCandidatesRef.current = [];
      }
    }

    if (signal.type === 'ice-candidate') {
      if (pcRef.current && pcRef.current.remoteDescription) {
        await pcRef.current.addIceCandidate(new RTCIceCandidate(signal.candidate));
      } else {
        // Queue candidates until remote description is set
        pendingCandidatesRef.current.push(signal.candidate);
      }
    }
  }, [createPeerConnection, sendSignal]);

  const getDataChannel = useCallback(() => {
    return dcRef.current;
  }, []);

  const cleanup = useCallback(() => {
    if (dcRef.current) {
      dcRef.current.close();
      dcRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.close();
      pcRef.current = null;
    }
    setConnectionState('new');
    pendingCandidatesRef.current = [];
  }, []);

  return {
    connectionState,
    createOffer,
    handleSignal,
    getDataChannel,
    cleanup,
    peerConnection: pcRef.current,
    dataChannel: dcRef.current,
  };
}
