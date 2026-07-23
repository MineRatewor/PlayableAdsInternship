var devCacheToken = Date.now();

fetch('project.json?dev=' + devCacheToken, { cache: 'no-store' })
    .then(response => response.json())
    .then(project_json => {
        // Development entrypoint: always request fresh scripts and resources.
        project_json.options = project_json.options || {};
        project_json.options.__disableCache = 1;
        project_json.options.__disableCacheByVer = 0;

        var src = project_json.src
            , c = 0
            , nc = 0
            , head = document.getElementsByTagName('head')[0];

        for (var i in src) {
            for (var j in src[i]) {
                nc++;
                var script = document.createElement("script");
                var scriptPath = i + src[i][j];
                script.src = scriptPath + (scriptPath.indexOf('?') >= 0 ? '&' : '?') + 'dev=' + devCacheToken;
                script.async = false;
                script.onload = a => {
                    c++;
                    if (c >= nc) {
                        window.$INIT$(project_json);
                    }
                };                    
                head.appendChild(script);                        
            }
        }
    });
