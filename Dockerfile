FROM nginx:1.30.5-alpine

RUN apk add --no-cache curl jq python3 py3-pip supervisor
COPY scripts/25-stripe-check.sh /docker-entrypoint.d/25-stripe-check.sh
RUN chmod 700 /docker-entrypoint.d/25-stripe-check.sh

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY index.html product.html privacy.html terms.html shipping-returns.html styles.css product.css premium.css spatial.css scene-loader.js depth.js product.js privacy.js checkout-config.js robots.txt sitemap.xml /usr/share/nginx/html/
COPY assets/film /usr/share/nginx/html/assets/film
COPY assets/sections /usr/share/nginx/html/assets/sections
COPY assets/product /usr/share/nginx/html/assets/product

COPY assets/scene /usr/share/nginx/html/assets/scene

RUN nginx -t

EXPOSE 80

COPY server/requirements.txt /app/requirements.txt
RUN python3 -m venv /opt/webhook && /opt/webhook/bin/pip install --no-cache-dir -r /app/requirements.txt
COPY server/webhook.py server/paypal.py server/checkout_tax.py /app/
COPY checkout.html checkout.css checkout.js paypal-return.html paypal-return.js /usr/share/nginx/html/
COPY server/supervisord.conf /etc/supervisord.conf
ENTRYPOINT ["/usr/bin/supervisord", "-c", "/etc/supervisord.conf"]
CMD []
