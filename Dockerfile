FROM nginx:1.27-alpine

COPY index.html styles.css scroll-film.js /usr/share/nginx/html/
COPY assets/film /usr/share/nginx/html/assets/film
COPY assets/sections /usr/share/nginx/html/assets/sections

EXPOSE 80
