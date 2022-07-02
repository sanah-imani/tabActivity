
var popup = {
    hexToColor: function(hex) {
        switch(hex) {
            case "#D37E8B": return "pink";
            case "#B5DC73": return "green";
            case "#81C6C6": return "blue";
            case "#FFCD6F": return "yellow";
            case "#F5903F": return "orange";
            case "#895374": return "purple";
        };
    },

    sendAction: function(request) {
        chrome.extension.sendMessage(request, function(_response) {
        });
    }
};


document.getElementById("faviform").addEventListener("submit", function(event) {
    event.preventDefault();
});

document.addEventListener('DOMContentLoaded', function(eventOut){
    eventOut.preventDefault();
    var btn = document.getElementById('visible-btn');
    chrome.storage.sync.get({"visible": true}, function(visData) {
        if (visData){
            btn.innerHTML = 'Hide'
        }
        else{
            btn.innerHTML = 'Show'
        }
    });
    btn.addEventListener('click', function handleClick(event) {
        event.preventDefault();
        if (btn.textContent == 'Show'){
            btn.innerHTML = 'Hide';
            popup.sendAction({action: 'show'});
        }
        else{
            btn.innerHTML = 'Show';
            popup.sendAction({action: 'hide'});
        }
           
      });

});

  

//button control 

document.getElementById("reset").addEventListener("click", function(event) {
    event.preventDefault();
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs){
        var tab = tabs[0];
        popup.sendAction({ action: "reset", tab: tab});
    });
    
});

//need to persist the visibility option
