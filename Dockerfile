FROM nginx:1.30.5-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html product.html privacy.html terms.html shipping-returns.html styles.css product.css premium.css spatial.css scene-loader.js product.js privacy.js checkout-config.js robots.txt sitemap.xml /usr/share/nginx/html/
COPY assets/film /usr/share/nginx/html/assets/film
COPY assets/sections /usr/share/nginx/html/assets/sections
COPY assets/product /usr/share/nginx/html/assets/product

COPY assets/scene /usr/share/nginx/html/assets/scene

RUN nginx -t

EXPOSE 80
