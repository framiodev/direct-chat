<?php

namespace Framiodev\DirectChat\Api\Serializer;

use Flarum\Api\Serializer\AbstractSerializer;
use Flarum\Api\Serializer\BasicUserSerializer;

class DirectMessageSerializer extends AbstractSerializer
{
    // API'nin JSON çıktısında bu verilerin hangi isimle (type) döneceğini belirliyoruz
    protected $type = 'direct_messages';

    /**
     * Veritabanındaki satırı API json formatına çevirir
     *
     * @param \Framiodev\DirectChat\DirectMessage $message
     * @return array
     */
    protected function getDefaultAttributes($message)
    {
        return [
            'message_text' => $message->message_text,
            'is_read'      => (bool) $message->is_read,
            'createdAt'    => $this->formatDate($message->created_at),
        ];
    }

    // Gönderici bilgilerini JSON'a ekler
    protected function sender($message)
    {
        return $this->hasOne($message, BasicUserSerializer::class);
    }

    // Alıcı bilgilerini JSON'a ekler
    protected function receiver($message)
    {
        return $this->hasOne($message, BasicUserSerializer::class);
    }
}
