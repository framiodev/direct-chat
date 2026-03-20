<?php

use Flarum\Database\Migration;

return Migration::addColumns('framiodev_direct_messages', [
    'message_type' => ['type' => 'string', 'length' => 50, 'default' => 'text'],
    'attachment_url' => ['type' => 'string', 'length' => 500, 'nullable' => true],
]);
