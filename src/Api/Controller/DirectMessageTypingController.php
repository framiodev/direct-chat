<?php

namespace Framiodev\DirectChat\Api\Controller;

use Illuminate\Support\Arr;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;

class DirectMessageTypingController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = $request->getAttribute('actor');
        $actor->assertRegistered();

        $data = Arr::get($request->getParsedBody(), 'data', []);
        $receiverId = Arr::get($data, 'attributes.receiver_id');

        if (!$receiverId) {
            return new JsonResponse(['error' => 'Receiver ID required'], 400);
        }

        try {
            // framiodev/pusher-hub eklentisi kurulu ise sinyalleri onun üzerinden gönder (Yazışma odaklı dağıtıcı)
            if (class_exists(\Framiodev\PusherHub\PusherHubManager::class)) {
                \Framiodev\PusherHub\PusherHubManager::trigger(
                    'private-user' . $receiverId,
                    'framiodev.direct-chat.typing',
                    ['userId' => $actor->id],
                    'messages' // Özellikle 'messages' veya 'default' sunucusuna gitmeyi dener
                );
            } elseif (class_exists(\Pusher\Pusher::class)) {
                // Fallback: Standart Flarum Pusher'ı kurulu ise
                $pusher = resolve(\Pusher\Pusher::class);
                $pusher->trigger('private-user' . $receiverId, 'framiodev.direct-chat.typing', [
                    'userId' => $actor->id
                ]);
            }
        } catch (\Exception $e) {}

        return new JsonResponse(['success' => true]);
    }
}
