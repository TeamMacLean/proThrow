#ProThrow

[![CircleCI](https://circleci.com/gh/TeamMacLean/proThrow.svg?style=svg)](https://circleci.com/gh/TeamMacLean/proThrow)
[![Codacy Badge](https://api.codacy.com/project/badge/Grade/66df9dd8d9cd44f397641c9d26d2bd60)](https://www.codacy.com/app/wookoouk/proThrow?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=TeamMacLean/proThrow&amp;utm_campaign=Badge_Grade)

```
npm install -g bower gulp
```


```
npm install
bower install

npm run-script build
npm run-script start
```

note: you need VIPS (brew install homebrew/science/vips --with-webp --with-graphicsmagick)

## Reverse Proxy
NGNIX
```
server {
        server_name  proteomics.tsl.ac.uk;
        location / {
            proxy_pass         http://127.0.0.1:3001/;
            proxy_redirect     off;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";

            proxy_set_header   Host             $host;
            proxy_set_header   X-Real-IP        $remote_addr;
            proxy_set_header   X-Forwarded-For  $proxy_add_x_forwarded_for;
            client_max_body_size 2000m;
        }
}
```
