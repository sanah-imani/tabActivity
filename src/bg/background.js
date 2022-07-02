//functionality that we are looking for: 

var tabData = {
    //retreive information
    get: function(request, tab, sendResponse){
        let key = tabKey(tab);
        var holder = document.createElement("img");
        holder.addEventListener("load", function(event) {
            var canvas = document.createElement("canvas");
            canvas.width = holder.width;
            canvas.height = holder.height;
            var context = canvas.getContext("2d");
            context.drawImage(holder, 0, 0)

            chrome.storage.sync.get(key, function(data) {
                sendResponse({ info: data[key], faviconUrl: canvas.toDataURL() });
            });
        });

        holder.src = request.faviconUrl || tab.favIconUrl;

    },

    //for a particular tab 
    set: function(request, sendResponse){
        chrome.tabs.query({active: true, currentWindow: true }, function (tabs){
            var currentTab = tabs[0];
            var key = tabKey(currentTab);
            var keyId = tabId(currentTab)
            var windowKey = chrome.windows.getCurrent();
            chrome.storage.sync.get(key, function(data){
                var obj = data || {};
                var current = new Date();
                obj[key] = obj[key] || {};
                obj[keyId] = key;
                obj[key].windowId = windowKey;
                obj[key].timeStamp = current.toLocaleDateString();
                obj[key].status = "active";
                obj[key].color = colorToHex("green");
    
            });
            chrome.tabs.sendMessage(currentTab.id, { info: request }, function(_response) {
                sendResponse({ info: "Values were set." });
            });
            console.log("New tab set");

        });
       

    }, 

    //update activity for all 
    updateActivity: function(){
        chrome.tabs.query({}, function(tabs){
            for (let i = 0; i < tabs.length; i++){
                var tabKey = tabKey(tabs[i]);
                chrome.storage.sync.get(tabKey, function(data) {
                    var obj = data || {};
                    obj[key] = obj[key] || {};
                    var timeStored = new Date(obj[key].timeStamp).getTime();
                    var diff = parseInt((current.getTime - timeStored)/1000);
                    
                    if (diff > 600){
                        obj[key].status = "inactive";
                    }
                    else if (diff > 300){
                        obj[key].status = "idle"
                    }
                    else{
                        obj[key].status = "active";
                    };
                    
                    if (obj[key].status == "active"){
                        obj[key].color = colorToHex("green");

                    }
                    else if (obj[key].status == "idle"){
                        obj[key].color = colorToHex("yellow")
                    }
                    else{
                        obj[key].color = colorToHex("red")
                    };
                    chrome.storage.sync.set(obj);

                });

            }

        });
        
    },
    //change the URL
    updateUrl: function(tabId, url){
        chrome.storage.sync.get(tabId, function(data){
            var obj = data || {};
            obj[tabId].url = url; 
        });

    },

    //visibility options
    show: function(request, sendResponse){
        chrome.tabs.query({ currentWindow: true, active: true }, function (tabsWin){
            var currentTab = tabs[0];
            chrome.storage.sync.set({"visible": true});
            chrome.tabs.sendMessage(currentTab.id, { info: request}, function(_response) {
                sendResponse({ info: "Values were reset." });
            });

        });
        
    },

    hide: function(request, sendResponse){
        chrome.tabs.query({ currentWindow: true, active: true }, function (tabsWin){
            var currentTab = tabs[0];
            chrome.storage.sync.set({"visible": false});
            chrome.tabs.sendMessage(currentTab.id, { info: request}, function(_response) {
                sendResponse({ info: "Values were reset." });
            });

        });

    },

    //completely reset
    reset: function(windowId, request, sendResponse){
        chrome.tabs.query({ currentWindow: true, active: true }, function (tabsWin){
            var currentTab = tabsWin[0];
            chrome.tabs.query({windowId:windowId}, function(tabs) { 
                for (let i = 0; i < tabs.length; i++){
                    var key = tabKey(tabs);
                    chrome.storage.sync.remove(key);
    
                }
                chrome.tabs.sendMessage(currentTab.id, { info: "reset" }, function(_response) {
                    sendResponse({ info: "Values were reset." });
                });
            });
        });
        
    }
};

//regular updates every 5 s = 5000 ms
setInterval(tabData.updateAll, 5000);

chrome.tabs.onActivated.addListener(function(activeInfo){
    var request = {action: "set"};
    chrome.extension.sendMessage(request, function(_response) {
    });
});

//the tab favicon injection requires a different event handler
chrome.extension.onMessage.addListener(function(request, sender, sendResponse){
    switch(request.action){
        case "get":
            var tab = sender.tab || request.tab;
            tabData.get(request, tab, sendResponse);
            return true;
        case "set":
            tabData.get(request, sendResponse);
        case "reset":
            var windowId = request.tab.windowId;
            tabData.reset(windowId, request, sendResponse);
            return true;
        case "hide":
            tabData.hide(request, sendResponse);
            return true;
        case "show":
            tabData.show(request, sendResponse);
            return true;
        default:
            return false;
    }
});
// Whenever we update the tab with a url change we need to remove
// the previous key
/*chrome.tabs.onUpdated.addListener(function(_id, change, tab) {
    chrome.storage.sync.get(tabKey(tab), function(data) {
        if (change.url && Object.keys(data).length === 0) {
            chrome.storage.sync.remove([tabId(tab), tabKey(tab)]);
        }
    });
});*/

// Since the key is based on the index of the tab we need to update the key
// when we move the tab
chrome.tabs.onMoved.addListener(function(id, info) {
    chrome.tabs.get(id, function(tab) {
        chrome.storage.sync.get(info.fromIndex.toString() + tab.url, function(data) {
            if (Object.keys(data).length !== 0) {
                let prevKey = info.fromIndex.toString() + tab.url;

                data[tabId(tab)] = tabKey(tab);
                data[tabKey(tab)] = data[prevKey];

                chrome.storage.sync.remove(prevKey);
                chrome.storage.sync.set(data);
            }
        })
    });
});

// When a tab is closed we need to clean up every data we have on it
chrome.tabs.onRemoved.addListener(function(tabId, info) {
    var keyId = tabId.toString();

    chrome.storage.sync.get(keyId, function(data) {
        chrome.storage.sync.remove([data[keyId], keyId]);
    });
})



// Whenever the extension gets installed/updated we need to reload every tab in the window
chrome.runtime.onInstalled.addListener(function() {
    reloadMessage = "In order to use Tab Activity you must first reload every open tab. \n\n Do you with to do it now?"

    if (confirm(reloadMessage)) {
        chrome.tabs.getAllInWindow(null, function(tabs) {
            for(i = 0; i < tabs.length; i++) {
                chrome.tabs.update(tabs[i].id, { url: tabs[i].url });
            }
        });
    }
});