chrome.runtime.onInstalled.addListener(onInit);
chrome.alarms.onAlarm.addListener(onAlarm);

function onInit() {
  chrome.alarms.create('watchdog', {periodInMinutes: 1});
  onWatchdog();
}

function onAlarm(alarm) {
  if (alarm && alarm.name == 'watchdog') {
    onWatchdog();
  }
}

function onWatchdog() {
  chrome.alarms.get('watchdog', function (alarm) {
    if (alarm) {
      chrome.storage.sync.get("subscriptions", function(item) {
        if (typeof item.subscriptions === "undefined") {
          item.subscriptions = {};
        }

        var subscriptions = [];
        for (var prop in item.subscriptions) {
          if (item.subscriptions.hasOwnProperty(prop)) {
            subscriptions.push((prop));
          }
        }

        if (subscriptions.length > 0) {
          var tests = subscriptions.join('+');
          var xhr = new XMLHttpRequest();
          var time = new Date().getTime();
          xhr.open("GET", "https://qa.drupal.org/pifr/test/" + tests + "/json?time=" + time, true);
          xhr.onreadystatechange = function () {
            if (xhr.readyState === 4 && typeof xhr.responseText !== "undefined") {
              try {
                var resp = JSON.parse(xhr.responseText);
                if (resp.tests && resp.tests.length) {
                  for (var i = 0; i < resp.tests.length; i++) {
                    if (resp.tests[i]['test']) {
                      test = resp.tests[i]['test'];
                      if (test.status === "Result") {

                        item.subscriptions[test.id] = null;
                        delete item.subscriptions[test.id];

                        if (!("Notification" in window)) {
                        }
                        else if (Notification.permission === "granted") {
                          // If it's okay let's create a notification
                          showResultNotification(test);
                        }
                        else if (Notification.permission !== 'denied') {
                          Notification.requestPermission(function (permission) {

                            // Whatever the user answers, we make sure we store the information
                            if (!('permission' in Notification)) {
                              Notification.permission = permission;
                            }

                            if (permission === "granted") {
                              showResultNotification(test);
                            }
                          });
                        }
                      }
                    }
                  }
                }
              }
              catch(e) {}
              finally {
                chrome.storage.sync.set({subscriptions: item.subscriptions});
              }
            }
          };
          xhr.send();
        }
      });
    }
  });
}

function showResultNotification(test) {
  var notification = new Notification(test.title, {
    body: 'Completed',
    icon: '48.png'
  });
  notification.onclick = function () {
    if (typeof test.dorg_link !== "undefined" && test.dorg_link.length > 0) {
      window.open(test.dorg_link);
    }
    else {
      window.open('https://qa.drupal.org/pifr/test/' + test.id);
    }
  }
  notification.show();
}