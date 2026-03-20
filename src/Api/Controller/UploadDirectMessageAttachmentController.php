<?php

namespace Framiodev\DirectChat\Api\Controller;

use Flarum\Foundation\Paths;
use Illuminate\Support\Str;
use Psr\Http\Message\ResponseInterface;
use Psr\Http\Message\ServerRequestInterface;
use Psr\Http\Server\RequestHandlerInterface;
use Laminas\Diactoros\Response\JsonResponse;

class UploadDirectMessageAttachmentController implements RequestHandlerInterface
{
    protected $paths;

    public function __construct(Paths $paths)
    {
        $this->paths = $paths;
    }

    public function handle(ServerRequestInterface $request): ResponseInterface
    {
        // 1. İşlem yapan kullanıcının giriş yapıp yapmadığını kontrol et
        $actor = $request->getAttribute('actor');
        $actor->assertRegistered();

        // 2. Yüklenen dosyayı al
        $files = $request->getUploadedFiles();
        $file = $files['file'] ?? null;

        if (! $file || $file->getError() !== UPLOAD_ERR_OK) {
            return new JsonResponse(['error' => 'Dosya yükleme başarısız oldu'], 400);
        }

        // 3. Güvenlik ve İsimlendirme: Rastgele bir isim veriyoruz
        $extension = pathinfo($file->getClientFilename(), PATHINFO_EXTENSION);
        $filename = Str::random(20) . '.' . $extension;
        
        // 4. Hedef klasörü ayarla (Flarum'un assets/ klasörü altına direct-chat dizini oluşturuyoruz)
        $uploadDir = $this->paths->public . '/assets/direct-chat';
        if (!is_dir($uploadDir)) {
            mkdir($uploadDir, 0755, true);
        }

        // 5. Dosyayı belirlenen yere taşı
        $file->moveTo($uploadDir . '/' . $filename);

        // 6. Başarıyla yüklenen dosyanın nispi (relative) URL'ini döndür
        $url = '/assets/direct-chat/' . $filename;

        return new JsonResponse([
            'url' => $url
        ]);
    }
}
