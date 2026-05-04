/* Spider Bundle - loaded as external script, not processed by Vite */
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
          this.a.pos.add(Vec2.mult(normal, stepCoef));
      },
      draw: function (ctx) {
          ctx.beginPath();
          ctx.moveTo(this.a.pos.x, this.a.pos.y);
          ctx.lineTo(this.pos.x, this.pos.y);
          ctx.strokeStyle = "rgba(255,255,255,0.9)";
          ctx.stroke();
      },
      };
  },
  { "./vec2": 6 },
  ],
  3: [
  function (require, module, exports) {
      var Vec2 = require("./vec2");
      var Constraint = require("./constraint");
      exports.Composite = function () {
      this.particles = [];
      this.constraints = [];
      this.drawParticles = null;
      this.drawConstraints = null;
      };
      exports.Composite.prototype = {
      pin: function (index, pos) {
          var p = this.particles[index];
          p.pos = pos;
          this.constraints.push(new Constraint.PinConstraint(p, 0));
      },
      };
  },
  { "./constraint": 2, "./vec2": 6 },
  ],
  4: [
  function (require, module, exports) {
      var VerletJS = require("./verlet");
      var Vec2 = require("./vec2");
      var Constraint = require("./constraint");
      var Composite = require("./composite");
      VerletJS.prototype.TIRE = function (step) {
      var stepCoef = step / 1000;
      var gravity = Vec2.create(0, 0.2);
      gravity.mult(stepCoef);
      this.composites.forEach(function (composite) {
          composite.particles.forEach(function (p) {
          if (p.pos.y < 0.5) {
              p.vel.y += 0.05;
              p.vel.x -= 0.01;
          }
          p.vel.add(gravity);
          });
          composite.constraints.forEach(function (constraint) {
          constraint.relax(stepCoef);
          });
      });
      this.world.step(stepCoef);
      };
      VerletJS.prototype.line = function (composite) {
      var c = composite;
      var i = c.particles.length;
      while (i--) {
          var p = c.particles[i];
          if (p.pos.y > 0.5) {
          c.particles.splice(i, 1);
          }
      }
      };
      VerletJS.prototype.viscousFluid = function (step) {
      var stepCoef = step / 1000;
      this.composites.forEach(function (composite) {
          composite.particles.forEach(function (p) {
          p.vel.mult(0.99);
          });
      });
      };
  },
  { "./composite": 3, "./constraint": 2, "./vec2": 6, "./verlet": 7 },
  ],
  5: [
  function (require, module, exports) {
      var Vec2 = require("./vec2");
      exports.VerletJS = function (canvas, options) {
      options = options || {};
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");
      this.width = canvas.width;
      this.height = canvas.height;
      this.gravity = Vec2.create(0, options.gravity || 0);
      this.timestep = options.timestep || 1 / 60;
      this.friction = options.friction || 0.99;
      this.world = new (require("./composite").Composite)();
      this.composites = [];
      this.frame = 0;
      this.onUpdate = null;
      this.onRender = null;
      this.onRenderEnd = null;
      };
      exports.VerletJS.prototype = {
      step: function () {
          var i = this.composites.length;
          while (i--) {
          var composite = this.composites[i];
          composite.update(this.timestep, this.gravity);
          composite.constrain();
          composite.draw(this.ctx);
          }
          if (this.onUpdate) this.onUpdate();
          if (this.onRender) this.onRender();
          if (this.onRenderEnd) this.onRenderEnd();
          this.frame++;
      },
      };
  },
  { "./composite": 3, "./vec2": 6 },
  ],
  6: [
  function (require, module, exports) {
      exports.Vec2 = {
      create: function (x, y) {
          return { x: x || 0, y: y || 0 };
      },
      mult: function (v, n) {
          v.x *= n;
          v.y *= n;
          return v;
      },
      sub: function (a, b) {
          return { x: a.x - b.x, y: a.y - b.y };
      },
      add: function (a, b) {
          return { x: a.x + b.x, y: a.y + b.y };
      },
      };
  },
  ],
  7: [
  function (require, module, exports) {
      var Vec2 = require("./vec2");
      var Constraint = require("./constraint");
      var Composite = require("./composite");
      Composite.prototype.update = function (timestep, gravity) {
      var i = this.particles.length;
      while (i--) {
          var p = this.particles[i];
          if (p.mass > 0) {
          p.vel.add(Vec2.mult(gravity, timestep));
          p.vel.mult(this.friction);
          p.pos.add(Vec2.mult(p.vel, timestep));
          }
      }
      };
      Composite.prototype.constrain = function () {
      var i = this.constraints.length;
      while (i--) {
          var c = this.constraints[i];
          c.relax();
      }
      };
      Composite.prototype.draw = function (ctx) {
      var i = this.particles.length;
      while (i--) {
          var p = this.particles[i];
          p.draw(ctx);
      }
      var i = this.constraints.length;
      while (i--) {
          var c = this.constraints[i];
          c.draw(ctx);
      }
      };
      exports.VerletJS = require("./verlet");
      exports.TIRE = require("./tire");
      exports.line = require("./line");
      exports.viscousFluid = require("./viscousFluid");
  },
  { "./constraint": 2, "./tire": 4, "./line": 4, "./viscousFluid": 4, "./vec2": 6, "./verlet": 5 },
  ],
},
{},
[1, 5]
);
