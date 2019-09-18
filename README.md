# ping-wrapper

Native wrapper for ping.

## Install

    npm install ping-wrapper2

## Example

```javascript
var ping = require("ping-wrapper2");

var exec = ping("google.com", { count: 20 }); // default 10 packets

exec.on("data", function(data){
  // { no: 1, bytes: 64, time: 54, ttl: 1 }
	console.log(data);
});

exec.on("exit", function(data){
  // { sent: 10, recieved: 10, loss: 0, time: 9010 }
	console.log(data);
});
```
