<?php

namespace Framiodev\DirectChat\Api\Controller;

use Flarum\Api\Controller\AbstractCreateController;
use Framiodev\DirectChat\Api\Serializer\DirectMessageSerializer;
use Framiodev\DirectChat\DirectMessage;
use Illuminate\Support\Arr;
use Psr\Http\Message\ServerRequestInterface;
use Tobscure\JsonApi\Document;

class CreateDirectMessageController extends AbstractCreateController
{
    // API'nin hangi Serializer ile veriyi döndüreceği
    public $serializer = DirectMessageSerializer::class;
    
    // Mesajlaşma sonrası dönen cevapta kullanıcı verileri de olacak
    public $include = ['sender', 'receiver'];

    /**
     * Frontend'den (arayüzden) gelen "yeni mesaj gönder" isteğini yakalar
     */
    protected function data(ServerRequestInterface $request, Document $document)
    {
        $actor = $request->getAttribute('actor'); // İstek yapan Flarum kullanıcısı
        $actor->assertRegistered(); // Giriş yapmış olmalı
        
        // POST ile Gönderilen datayı JSON içerisinden al ($data['attributes'] içinde gelir)
        $data = Arr::get($request->getParsedBody(), 'data', []);
        
        // 1. Yeni boş bir model nesnesi oluştur
        $message = new DirectMessage();
        
        // 2. Mesajı giren kişinin Flarum ID'sini kaydet
        $message->sender_id = $actor->id;
        
        // 3. Mesajın gönderileceği alıcının ID'sini kaydet
        $message->receiver_id = Arr::get($data, 'attributes.receiver_id');
        
        // 4. Gönderilen mesaj metnini kaydet
        $message->message_text = Arr::get($data, 'attributes.message_text');
        
        // Flarum standartlarına uygun bir eklentiyse, burada Validator (Boşluk kontrolü vs) olmalıdır. 
        // Şimdilik sadece kaydediyoruz:
        $message->save();

        // Başarılı bir şekilde model kaydedildi, frontend'e (JS) bu mesajı JSON olarak ver:
        return $message;
    }
}
