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
            if (class_exists(\Pusher\Pusher::class)) {
                $pusher = resolve(\Pusher\Pusher::class);
                $pusher->trigger('private-user' . $receiverId, 'framiodev.direct-chat.typing', [
                    'userId' => $actor->id
                ]);
            }
        } catch (\Exception $e) {}

        return new JsonResponse(['success' => true]);
    }
}
