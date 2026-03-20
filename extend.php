<?php

/**
 * Direct Chat - A messaging extension for Flarum.
 *
 * @author Framiodev
 * @license MIT
 */

namespace Framiodev\DirectChat;

use Flarum\Extend;

return [
    // Frontend (Kullanıcı Forumu) javascript ve css dosyalarını dahil ediyoruz
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less'),
        
    // Dil dosyalarının nerede olduğunu belirtiyoruz
    new Extend\Locales(__DIR__.'/locale'),

    // API Uç Noktaları (Gelen/Giden mesaj işlemleri)
    (new Extend\Routes('api'))
        ->get('/direct-messages', 'direct-messages.index', Api\Controller\ListDirectMessagesController::class)
        ->post('/direct-messages', 'direct-messages.create', Api\Controller\CreateDirectMessageController::class),
];
