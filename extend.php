<?php

/**
 * Direct Chat - A messaging extension for Flarum.
 *
 * @author Framiodev
 * @license MIT
 */

use Flarum\Extend;
use Framiodev\DirectChat\Api\Controller\ListDirectMessagesController;
use Framiodev\DirectChat\Api\Controller\CreateDirectMessageController;
use Framiodev\DirectChat\Api\Controller\UploadDirectMessageAttachmentController;
use Framiodev\DirectChat\Api\Controller\MarkDirectMessagesReadController;
use Framiodev\DirectChat\Api\Controller\DirectMessageTypingController;
use Framiodev\DirectChat\Api\Controller\DirectMessageCallController;

return [
    // Frontend assetleri
    (new Extend\Frontend('forum'))
        ->js(__DIR__.'/js/dist/forum.js')
        ->css(__DIR__.'/less/forum.less'),
        
    // Dil dosyaları
    new Extend\Locales(__DIR__.'/locale'),

    // API Rotaları - Sınıf isimlerini açıkça belirtiyoruz
    (new Extend\Routes('api'))
        ->get('/direct-messages', 'direct-messages.index', ListDirectMessagesController::class)
        ->post('/direct-messages', 'direct-messages.create', CreateDirectMessageController::class)
        ->post('/direct-messages/upload', 'direct-messages.upload', UploadDirectMessageAttachmentController::class)
        ->post('/direct-messages/read', 'direct-messages.read', MarkDirectMessagesReadController::class)
        ->post('/direct-messages/typing', 'direct-messages.typing', DirectMessageTypingController::class)
        ->post('/direct-messages/call', 'direct-messages.call', DirectMessageCallController::class)
];
