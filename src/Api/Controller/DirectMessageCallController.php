<?php

namespace Framiodev\DirectChat\Api\Controller;

use Illuminate\Support\Arr;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;

class DirectMessageCallController implements RequestHandlerInterface
{
    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        $actor = $request->getAttribute('actor');
        $actor->assertRegistered();

        $data = Arr::get($request->getParsedBody(), 'data', []);
        $receiverId = Arr::get($data, 'attributes.receiver_id');
        $type = Arr::get($data, 'attributes.type'); // 'offer', 'answer', 'candidate', 'hangup'
        $signal = Arr::get($data, 'attributes.signal');
        $callType = Arr::get($data, 'attributes.call_type', 'video'); // 'audio', 'video'

        if (!$receiverId) {
            return new JsonResponse(['error' => 'Receiver ID required'], 400);
        }

        try {
            // framiodev/pusher-hub eklentisi kurulu ise sinyalleri onun üzerinden gönder (RTC odaklı dağıtıcı)
            if (class_exists(\Framiodev\PusherHub\PusherHubManager::class)) {
                \Framiodev\PusherHub\PusherHubManager::trigger(
                    'private-user' . $receiverId,
                    'framiodev.direct-chat.call-signal',
                    [
                        'senderId' => $actor->id,
                        'senderName' => $actor->username,
                        'senderAvatar' => $actor->avatar_url,
                        'type' => $type,
                        'signal' => $signal,
                        'callType' => $callType
                    ],
                    'rtc' // Özellikle 'rtc' sunucusuna gitmeyi dener
                );
            } elseif (class_exists(\Pusher\Pusher::class)) {
                // Fallback: Standart Flarum Pusher'ı kurulu ise
                $pusher = resolve(\Pusher\Pusher::class);
                $pusher->trigger('private-user' . $receiverId, 'framiodev.direct-chat.call-signal', [
                    'senderId' => $actor->id,
                    'senderName' => $actor->username,
                    'senderAvatar' => $actor->avatar_url,
                    'type' => $type,
                    'signal' => $signal,
                    'callType' => $callType
                ]);
            }
        } catch (\Exception $e) {}

        return new JsonResponse(['success' => true]);
    }
}
