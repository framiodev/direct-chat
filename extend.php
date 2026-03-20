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
        
    // Admin Paneli (Yönetim) javascript ve css dosyalarını dahil ediyoruz
    (new Extend\Frontend('admin'))
        ->js(__DIR__.'/js/dist/admin.js')
        ->css(__DIR__.'/less/admin.less'),
        
    // Dil dosyalarının nerede olduğunu belirtiyoruz
    new Extend\Locales(__DIR__.'/locale'),
];
