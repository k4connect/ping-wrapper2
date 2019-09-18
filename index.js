var events = require("events");
var child  = require("child_process");
var os = require("os");

var LINUX_EXIT_REG = /^(\d+) packets transmitted, (\d+) received, (.*\%) packet loss, time (\d+)ms$/m;
var MAC_EXIT_REG = /^(\d+) packets transmitted, (\d+) packets received, (.*\%) packet loss$/m;
var LINE_REG = /^(\d+) bytes from (.*?): icmp_[rs]eq=(\d+) ttl=(\d+) time=([\d\.]+) ms$/;

module.exports = function (target, options) {
  var emitter = new events.EventEmitter;
  var packets = 0;
  var startTime = process.hrtime();


  options = options || {};
  options.count = options.count || 10;
  options.deadline = options.deadline || options.count;
  if (typeof options.pingInterval !== 'number') {
    options.pingInterval = 0.9;
  }

  if (os.platform() == "win32") {
    var spawn = child.spawn("ping", ["-n", options.count, target]);
  } else if (os.platform() == 'linux') {
    // N.B. Spaces out pings to 0.9 seconds (default), and waits for the full ping emission-
    // response roundtrip
    var cmdLineArgsArray = ["-c", options.count, "-w", options.deadline, "-f", "-i", options.pingInterval, target];
    var spawn = child.spawn("ping", cmdLineArgsArray);
  } else {
    var spawn = child.spawn("ping", ["-c", options.count, "-w", options.deadline, target]);
  }
  spawn.stdout.on("data", data);

  return emitter;

  function line(str) {
    str = str.trim().replace(/\s+/g, " ");

    var match = str.match(LINE_REG);
    if (!match) {
      match_linux = str.match(LINUX_EXIT_REG);
      match_mac = str.match(MAC_EXIT_REG);

      // N.B. Adding "+" before each of the referenced array
      // elements will coerce 'undefined' values to NaN.
      if (match_linux) {
        var lossPercentageStrLinux = match_linux[3];
        var lossPercentageRegexMatchLinux = lossPercentageStrLinux.match(/(\d+)%/m);
        var lossPercentageNumLinux = NaN;
        if (lossPercentageRegexMatchLinux && lossPercentageRegexMatchLinux[1]) {
          lossPercentageNumLinux = parseInt(lossPercentageRegexMatchLinux[1], 10);
        }

        emitter.emit("exit", {
          target: target,
          sent: +match_linux[1],
          recieved: +match_linux[2],
          loss: lossPercentageNumLinux,
          time: +match_linux[4]
        });
      } else if (match_mac) {
        var lossPercentageStrMac = match_linux[3];
        var lossPercentageRegexMatchMac = lossPercentageStrMac.match(/(\d+)%/m);
        var lossPercentageNumMac = NaN;
        if (lossPercentageRegexMatchMac && lossPercentageRegexMatchMac[1]) {
          lossPercentageNumMac = parseInt(lossPercentageRegexMatchMac[1], 10);
        }

        emitter.emit("exit", {
          target: target,
          sent: +match_mac[1],
          recieved: +match_mac[2],
          loss: lossPercentageNumMac,
          time: +process.hrtime(startTime)[0] + " s"
        });
      }
    } else {
      emitter.emit("data", {
        target: target,
        no: ++packets,
        bytes: +match[1],
        time: +match[5],
        ttl: +match[4]
      });
    }
  }

  function data(str) {
    str = str + "";
    var lines = str.split("\n");
    if (lines.length > 0) {
      lines.forEach(line);
    } else {
      line(data);
    }
  }
};
