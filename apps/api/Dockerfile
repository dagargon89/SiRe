# SiRe API — imagen de producción (PHP-FPM 8.3 + extensiones CI4)
FROM php:8.3-fpm-alpine

# Dependencias de sistema y extensiones PHP.
RUN apk add --no-cache \
        icu-dev oniguruma-dev libzip-dev gmp-dev libpng-dev freetype-dev libjpeg-turbo-dev \
        $PHPIZE_DEPS \
    && docker-php-ext-configure gd --with-freetype --with-jpeg \
    && docker-php-ext-install -j"$(nproc)" mysqli intl mbstring bcmath gmp gd zip \
    && pecl install redis \
    && docker-php-ext-enable redis \
    && apk del $PHPIZE_DEPS

# Composer.
COPY --from=composer:2 /usr/bin/composer /usr/bin/composer

WORKDIR /var/www/sire/apps/api

# Instala dependencias primero (capa cacheable).
COPY composer.json composer.lock ./
RUN composer install --no-dev --no-interaction --prefer-dist --no-scripts --optimize-autoloader

# Copia el código de la app.
COPY . .

# Permisos de writable.
RUN chown -R www-data:www-data writable && chmod -R 0775 writable

EXPOSE 9000
CMD ["php-fpm"]
