<?php

namespace Framiodev\DirectChat\Api\Controller;

use Framiodev\DirectChat\DirectMessage;
use Illuminate\Support\Arr;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;

class MarkDirectMessagesReadController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = $request->getAttribute('actor');
        $actor->assertRegistered();

        $data = Arr::get($request->getParsedBody(), 'data', []);
        $senderId = Arr::get($data, 'attributes.sender_id');

        if (!$senderId) {
            return new JsonResponse(['error' => 'Sender ID is required'], 400);
        }

        // Mesajları okundu olarak işaretle
        DirectMessage::where('receiver_id', $actor->id)
            ->where('sender_id', $senderId)
            ->where('is_read', false)
            ->update(['is_read' => true]);

        // Okundu bilgisini anlık olarak gönderen kişiye (WebSocket) ilet
        try {
            if (class_exists(\Pusher\Pusher::class)) {
                $pusher = resolve(\Pusher\Pusher::class);
                $pusher->trigger('private-user' . $senderId, 'framiodev.direct-chat.messages-read', [
                    'readerId' => $actor->id
                ]);
            }
        } catch (\Exception $e) {}

        return new JsonResponse(['success' => true]);
    }
}
