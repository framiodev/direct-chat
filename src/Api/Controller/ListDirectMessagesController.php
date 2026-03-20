<?php

namespace Framiodev\DirectChat\Api\Controller;

use Flarum\Api\Controller\AbstractListController;
use Framiodev\DirectChat\Api\Serializer\DirectMessageSerializer;
use Framiodev\DirectChat\DirectMessage;
use Psr\Http\Message\ServerRequestInterface;
use Tobscure\JsonApi\Document;

class ListDirectMessagesController extends AbstractListController
{
    // API'nin hangi Serializer ile veriyi dönüştüreceği
    public $serializer = DirectMessageSerializer::class;

    // JSON nesnesine ilişkili aktörleri de ekliyoruz
    public $include = ['sender', 'receiver'];

    /**
     * Mesajları veritabanından çeken asıl fonksiyon
     */
    protected function data(ServerRequestInterface $request, Document $document)
    {
        // İstek yapan kullanıcının kimliğini (ID) al
        $actor = $request->getAttribute('actor');

        // Giriş yapmamış kişilerin mesaj isteklerini engelle (Yetki kontrolü)
        $actor->assertRegistered();

        // SADECE aktif kullanıcının gönderdiği veya aldığı mesajları filtrele
        return DirectMessage::where('sender_id', $actor->id)
            ->orWhere('receiver_id', $actor->id)
            ->orderBy('created_at', 'desc')
            ->get();
    }
}
