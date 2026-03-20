<?php

use Illuminate\Database\Schema\Blueprint;
use Flarum\Database\Migration;

return Migration::createTable('framiodev_direct_messages', function (Blueprint $table) {
    $table->increments('id');
    $table->integer('sender_id')->unsigned();
    $table->integer('receiver_id')->unsigned();
    $table->text('message_text');
    $table->boolean('is_read')->default(false);
    $table->boolean('is_deleted_by_sender')->default(false);
    $table->boolean('is_deleted_by_receiver')->default(false);
    $table->timestamps(); // created_at ve updated_at sütunlarını ekler
    
    // Flarum'un user (kullanıcılar) tablosundaki ID'ye bağlanır (Yabancı anahtar/Foreign Key)
    $table->foreign('sender_id')->references('id')->on('users')->onDelete('cascade');
    $table->foreign('receiver_id')->references('id')->on('users')->onDelete('cascade');
});
