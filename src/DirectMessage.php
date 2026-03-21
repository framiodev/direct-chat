<?php

namespace Framiodev\DirectChat;

use Flarum\Database\AbstractModel;
use Flarum\User\User;

class DirectMessage extends AbstractModel
{
    // Hangi veritabanı tablosunu kullanacağını belirtiyoruz
    protected $table = 'framiodev_direct_messages';
    
    // AbstractModel'de timestamp kapalı gelir, açıyoruz ki DateTime verileri çalışşsın
    public $timestamps = true;
    
    // Tarihsel veriler
    protected $dates = ['created_at', 'updated_at'];

    /**
     * Mesajı gönderen kullanıcıyı çağırır
     */
    public function sender()
    {
        return $this->belongsTo(User::class, 'sender_id');
    }

    /**
     * Mesajı alan kullanıcıyı çağırır
     */
    public function receiver()
    {
        return $this->belongsTo(User::class, 'receiver_id');
    }
}
