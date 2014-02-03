module( "ExSIP.WebRTC.Logger", {
  setup: function() {
  }, teardown: function() {
  }
});

test('formatMsg', function() {
  var logger = new ExSIP.Logger('some prefix');
  ok(logger.formatMsg('some message').indexOf('some prefix : some message') != -1);
});
test('getTimeFor', function() {
  var logger = new ExSIP.Logger('some prefix');
  strictEqual(logger.getTimeFor(new Date(Date.parse("06/12/2009 12:52:39"))), "0612/125239");
});
