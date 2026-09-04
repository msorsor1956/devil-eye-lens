FROM nginx:1.27-alpine

COPY index.html product.html styles.css product.css scroll-film.js product.js checkout-config.js /usr/share/nginx/html/
COPY assets/film /usr/share/nginx/html/assets/film
COPY assets/sections /usr/share/nginx/html/assets/sections
COPY assets/product /usr/share/nginx/html/assets/product

EXPOSE 80
