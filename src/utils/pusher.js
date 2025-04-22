const Pusher = require('pusher');

const pusher = new Pusher({
  appId: "1978717",
  key: "8ead423625240b343c0b",
  secret: "2ed1e70a36e1c786e899",
  cluster: "ap1",
  useTLS: true
});

module.exports = pusher; 