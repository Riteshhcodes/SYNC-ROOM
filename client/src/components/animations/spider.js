// Spider animation wrapper
// Usage: initSpider() to show, stopSpider() to hide

let spiderStarted = false;
let spiderCanvas = null;

function runSpiderBundle() {
!(function (e, t, n) {
function i(n, s) {
  if (!t[n]) {
  if (!e[n]) {
      var o = typeof require == "function" && require;
      if (!s && o) return o(n, !0);
      if (r) return r(n, !0);
      throw new Error("Cannot find module '" + n + "'");
  }
  var u = (t[n] = { exports: {} });
  e[n][0].call(
      u.exports,
      function (t) {
      var r = e[n][1][t];
      return i(r ? r : t);
      },
      u,
      u.exports
  );
  }
  return t[n].exports;
}
var r = typeof require == "function" && require;
for (var s = 0; s < n.length; s++) i(n[s]);
return i;
})(
{
  1: [
  function (require, module, exports) {
      var VerletJS = require("./verlet");
      var constraint = require("./constraint");
      require("./objects");
      window.Vec2 = require("./vec2");
      window.VerletJS = VerletJS;
  },
  { "./constraint": 2, "./objects": 4, "./vec2": 6, "./verlet": 7 },
  ],
  2: [
  function (require, module, exports) {
      var Vec2 = require("./vec2");
      exports.Constraint = function () {};
      exports.PinConstraint = function (a, stiffness) {
      this.a = a;
      this.pos = Vec2.create(a.pos[0], a.pos[1]);
      this.stiffness = stiffness || 1;
      };
      exports.PinConstraint.prototype = {
      relax: function (stepCoef) {
          var normal = Vec2.sub(this.pos, this.a.pos);
          this.a.pos = Vec2.add(
          this.a.pos,
          Vec2.scale(normal, this.stepCoef || this.stiffness)
          );
      },
      draw: function (ctx) {
          ctx.beginPath();
          ctx.arc(this.pos[0], this.pos[1], 6, 0, 2 * Math.PI);
          ctx.fillStyle = "rgba(255,255,255,0.2)";
          ctx.fill();
      },
      };
      exports.DistanceConstraint = function (a, b, stiffness, distance) {
      this.a = a;
      this.b = b;
      this.distance = distance || Vec2.dist(a.pos, b.pos);
      this.stiffness = stiffness || 1;
      };
      exports.DistanceConstraint.prototype = {
      relax: function (stepCoef) {
          var normal = Vec2.sub(this.a.pos, this.b.pos);
          var m = Vec2.mag(normal);
          normal = Vec2.scale(
          normal,
          (((this.distance - m) / m) * this.stiffness * stepCoef) / 2
          );
          this.a.pos = Vec2.add(this.a.pos, normal);
          this.b.pos = Vec2.sub(this.b.pos, normal);
      },
      draw: function (ctx) {
          ctx.beginPath();
          ctx.moveTo(this.a.pos[0], this.a.pos[1]);
          ctx.lineTo(this.b.pos[0], this.b.pos[1]);
      },
      };
  },
  { "./vec2": 6 },
  ],
  3: [
  function (require, module, exports) {
      var Vec2 = require("./vec2");
      exports.Composite = function () {
      this.particles = [];
      this.constraints = [];
      };
      exports.Composite.prototype = {
      pin: function (index, pos) {
          pos = pos || this.particles[index].pos;
          var pc = new VerletJS.PinConstraint(this.particles[index], pos);
          this.constraints.push(pc);
          return pc;
      },
      };
  },
  { "./vec2": 6 },
  ],
  4: [
  function (require, module, exports) {
      var Vec2 = require("./vec2");
      var VerletJS = require("./verlet");
      VerletJS.prototype.lineSegments = function (
      vertices,
      stiffness,
      composite
      ) {
      var i, c, p;
      c = composite || new VerletJS.Composite();
      for (i = 0; i < vertices.length; ++i) {
          p = new VerletJS.Particle(Vec2.create(vertices[i][0], vertices[i][1]));
          c.particles.push(p);
          if (i > 0) {
          c.constraints.push(
              new VerletJS.DistanceConstraint(
              c.particles[i],
              c.particles[i - 1],
              stiffness
              )
          );
          }
      }
      return c;
      };
      VerletJS.prototype.tire = function (
      origin,
      radius,
      segments,
      spokeStiffness,
      treadStiffness,
      composite
      ) {
      var i, c, p;
      var stride = (2 * Math.PI) / segments;
      c = composite || new VerletJS.Composite();
      for (i = 0; i < segments; ++i) {
          p = new VerletJS.Particle(
          Vec2.create(
              origin[0] + Math.sin(i * stride) * radius,
              origin[1] + Math.cos(i * stride) * radius
          )
          );
          c.particles.push(p);
      }
      for (i = 0; i < segments; ++i) {
          c.constraints.push(
          new VerletJS.DistanceConstraint(
              c.particles[i],
              c.particles[(i + 1) % segments],
              treadStiffness
          )
          );
          c.constraints.push(
          new VerletJS.DistanceConstraint(
              c.particles[i],
              c.particles[(i + Math.floor(segments / 2)) % segments],
              spokeStiffness
          )
          );
      }
      return c;
      };
  },
  { "./vec2": 6, "./verlet": 7 },
  ],
  5: [
  function (require, module, exports) {
      var Vec2 = require("./vec2");
      var VerletJS = require("./verlet");
      var constraintModule = require("./constraint");
      var canvas = document.getElementById("web");
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      var ctx = canvas.getContext("2d");
      var sim = new VerletJS(canvas.width, canvas.height, canvas);
      sim.friction = 1;
      sim.gravity = Vec2.create(0, 0);
      var segments = 35;
      var spider = {};
      var poi = Vec2.create(canvas.width / 2, canvas.height / 2);
      var attraction = 0.0009;
      var dampen = 0.99;
      spider.abdomenLength = 35;
      spider.thoraxLength = 25;
      spider.headLength = 25;
      spider.head = Vec2.create(0, 0);
      spider.vel = Vec2.create(0, 0);
      spider.acc = Vec2.create(0, 0);
      spider.maxSpeed = 5;
      spider.pos = Vec2.create(
      canvas.width * Math.random(),
      canvas.height * Math.random()
      );
      spider.force = function () {
      var r = Vec2.sub(poi, spider.pos);
      spider.acc = Vec2.scale(r, attraction);
      spider.vel = Vec2.scale(Vec2.add(spider.vel, spider.acc), dampen);
      if (Vec2.mag(spider.vel) > spider.maxSpeed) {
          spider.vel = Vec2.scale(
          Vec2.normalise(spider.vel),
          spider.maxSpeed
          );
      }
      spider.pos = Vec2.add(spider.pos, spider.vel);
      };
      window.addEventListener("mousemove", function (e) {
      poi = Vec2.create(e.clientX, e.clientY);
      });
      window.addEventListener("touchmove", function (e) {
      poi = Vec2.create(e.touches[0].clientX, e.touches[0].clientY);
      });
      var legs = [];
      var numLegs = 8;
      for (var l = 0; l < numLegs; l++) {
      legs[l] = sim.lineSegments(
          [
          [spider.pos[0], spider.pos[1]],
          [spider.pos[0], spider.pos[1]],
          [spider.pos[0], spider.pos[1]],
          ],
          0.99
      );
      legs[l].pin(0);
      }
      var web = sim.tire(
      Vec2.create(canvas.width / 2, canvas.height / 2),
      canvas.height / 2.2,
      segments,
      0.3,
      0.99
      );
      window.addEventListener("resize", function () {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      });
      var df = 0;
      sim.onUpdate = function () {
      var i, leg, angle, dist;
      spider.force();
      var dir = Vec2.sub(spider.pos, spider.head);
      var angle_rad = Math.atan2(dir[1], dir[0]);
      spider.head = spider.pos;
      df++;
      for (i = 0; i < numLegs; i++) {
          leg = legs[i];
          leg.particles[0].pos = Vec2.create(spider.pos[0], spider.pos[1]);
          angle =
          angle_rad +
          (Math.PI / 4) * Math.floor(i / 2) -
          Math.PI / 8 +
          (i % 2 == 0 ? 0 : Math.PI);
          dist = i % 2 == 0 ? 50 : 40;
          if (df % 6 == 0) {
          leg.particles[2].pos = Vec2.create(
              spider.pos[0] + Math.cos(angle) * dist,
              spider.pos[1] + Math.sin(angle) * dist
          );
          }
      }
      };
      function drawSpider(ctx) {
      var i, leg;
      ctx.save();
      var dir = Vec2.sub(spider.pos, spider.head);
      var angle_body = Math.atan2(dir[1], dir[0]);
      ctx.translate(spider.pos[0], spider.pos[1]);
      ctx.rotate(angle_body);
      var grad = ctx.createRadialGradient(0, 0, 2, 0, 0, 20);
      grad.addColorStop(0, "#fff");
      grad.addColorStop(1, "#222");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.ellipse(
          -(spider.abdomenLength / 2),
          0,
          spider.abdomenLength / 2,
          spider.abdomenLength / 3,
          0,
          0,
          Math.PI * 2
      );
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(
          spider.thoraxLength / 2,
          0,
          spider.thoraxLength / 2,
          spider.thoraxLength / 2.5,
          0,
          0,
          Math.PI * 2
      );
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
          spider.thoraxLength + spider.headLength / 2,
          0,
          spider.headLength / 2,
          0,
          Math.PI * 2
      );
      ctx.fill();
      ctx.fillStyle = "#f00";
      ctx.beginPath();
      ctx.arc(
          spider.thoraxLength + spider.headLength / 2 - 4,
          -4,
          3,
          0,
          Math.PI * 2
      );
      ctx.fill();
      ctx.beginPath();
      ctx.arc(
          spider.thoraxLength + spider.headLength / 2 + 4,
          -4,
          3,
          0,
          Math.PI * 2
      );
      ctx.fill();
      ctx.restore();
      for (i = 0; i < numLegs; i++) {
          leg = legs[i];
          ctx.strokeStyle = "rgba(0,0,0,0.8)";
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          leg.constraints.forEach(function (c) {
          c.draw(ctx);
          });
          ctx.stroke();
      }
      }
      function drawWeb(ctx) {
      ctx.strokeStyle = "rgba(0,0,0,0.15)";
      ctx.lineWidth = 1;
      web.constraints.forEach(function (c) {
          ctx.beginPath();
          c.draw(ctx);
          ctx.stroke();
      });
      }
      function loop() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      sim.frame(16);
      drawWeb(ctx);
      drawSpider(ctx);
      requestAnimationFrame(loop);
      }
      loop();
  },
  { "./constraint": 2, "./vec2": 6, "./verlet": 7 },
  ],
  6: [
  function (require, module, exports) {
      var Vec2 = (module.exports = {});
      Vec2.create = function (x, y) {
      return [x, y];
      };
      Vec2.add = function (v, w) {
      return [v[0] + w[0], v[1] + w[1]];
      };
      Vec2.sub = function (v, w) {
      return [v[0] - w[0], v[1] - w[1]];
      };
      Vec2.scale = function (v, n) {
      return [v[0] * n, v[1] * n];
      };
      Vec2.mag = function (v) {
      return Math.sqrt(v[0] * v[0] + v[1] * v[1]);
      };
      Vec2.normalise = function (v) {
      return Vec2.scale(v, 1 / Vec2.mag(v));
      };
      Vec2.dist = function (v, w) {
      return Vec2.mag(Vec2.sub(v, w));
      };
      Vec2.dot = function (v, w) {
      return v[0] * w[0] + v[1] * w[1];
      };
  },
  {},
  ],
  7: [
  function (require, module, exports) {
      var Vec2 = require("./vec2");
      var constraintModule = require("./constraint");
      VerletJS = function (width, height, canvas) {
      this.width = width;
      this.height = height;
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.mouse = Vec2.create(0, 0);
      this.mouseDown = false;
      this.draggedEntity = null;
      this.selectionRadius = 20;
      this.highlightColor = "#4f545c";
      var _this = this;
      this.canvas.addEventListener("mousedown", function (e) {
          var nearest = _this.nearestEntity();
          if (nearest) {
          _this.draggedEntity = nearest;
          }
      });
      this.canvas.addEventListener("mousemove", function (e) {
          _this.mouse = Vec2.create(e.clientX, e.clientY);
      });
      this.canvas.addEventListener("mouseup", function (e) {
          _this.draggedEntity = null;
      });
      this.gravity = Vec2.create(0, 0.2);
      this.friction = 0.99;
      this.groundFriction = 0.8;
      this.composites = [];
      };
      VerletJS.prototype.Particle = function (pos) {
      this.pos = Vec2.create(pos[0], pos[1]);
      this.lastPos = Vec2.create(pos[0], pos[1]);
      };
      VerletJS.Particle = function (pos) {
      this.pos = Vec2.create(pos[0], pos[1]);
      this.lastPos = Vec2.create(pos[0], pos[1]);
      };
      VerletJS.prototype.composite = function () {
      var c = new VerletJS.Composite();
      this.composites.push(c);
      return c;
      };
      VerletJS.prototype.newComposite = function () {
      var c = new VerletJS.Composite();
      this.composites.push(c);
      return c;
      };
      VerletJS.Composite = require("./composite").Composite;
      VerletJS.PinConstraint = constraintModule.PinConstraint;
      VerletJS.DistanceConstraint = constraintModule.DistanceConstraint;
      VerletJS.prototype.nearestEntity = function () {
      var c, p, i, j;
      var nearest = null;
      var nearestDistance = this.selectionRadius;
      for (i in this.composites) {
          c = this.composites[i];
          for (j in c.particles) {
          p = c.particles[j];
          var d = Vec2.dist(this.mouse, p.pos);
          if (d < nearestDistance) {
              nearest = p;
              nearestDistance = d;
          }
      }
      }
      return nearest;
      };
      VerletJS.prototype.frame = function (step) {
      var c, i, j;
      if (this.draggedEntity) {
          this.draggedEntity.pos = this.mouse;
      }
      for (i in this.composites) {
          c = this.composites[i];
          for (j in c.particles) {
          var particles = c.particles[j];
          var velocity = Vec2.scale(
              Vec2.sub(particles.pos, particles.lastPos),
              this.friction
          );
          particles.lastPos = Vec2.create(particles.pos[0], particles.pos[1]);
          particles.pos = Vec2.add(particles.pos, velocity);
          particles.pos = Vec2.add(particles.pos, this.gravity);
          }
      }
      var stepCoef = 1 / step;
      for (i in this.composites) {
          c = this.composites[i];
          for (j in c.constraints) {
          c.constraints[j].relax(stepCoef);
          }
      }
      if (this.onUpdate) {
          this.onUpdate();
      }
      };
      VerletJS.prototype.draw = function () {
      var c, i;
      for (i in this.composites) {
          c = this.composites[i];
          if (c.drawParticles) c.drawParticles(this.ctx, c.particles);
          if (c.drawConstraints) c.drawConstraints(this.ctx, c.constraints);
      }
      };
  },
  { "./composite": 3, "./constraint": 2, "./vec2": 6 },
  ],
},
{},
[1, 5]
);
}

export function initSpider() {
  if (spiderStarted) return;
  
  spiderCanvas = document.getElementById('spider-canvas');
  if (!spiderCanvas) return;
  spiderCanvas.style.opacity = '1';
  spiderStarted = true;

  // Redirect canvas selection to #spider-canvas
  const origGetById = document.getElementById.bind(document);
  document.getElementById = function(id) {
    if (id === 'web') return spiderCanvas;
    return origGetById(id);
  };

  // Run the spider bundle
  runSpiderBundle();

  // Restore original getElementById after a delay to ensure spider initializes
  setTimeout(() => {
    document.getElementById = origGetById;
  }, 100);
}

export function stopSpider() {
  if (!spiderStarted) return;
  spiderStarted = false;
  if (spiderCanvas) {
    spiderCanvas.style.opacity = '0';
  }
}
