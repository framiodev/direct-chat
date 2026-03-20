import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import m from 'flarum/common/mithril';
import HeaderSecondary from 'flarum/forum/components/HeaderSecondary';
import UserPage from 'flarum/forum/components/UserPage';
import Button from 'flarum/common/components/Button';
import ChatWidget from './components/ChatWidget';

app.initializers.add('framiodev/direct-chat', () => {
    // 1. Forum menüsünün en sağına (gizli bir şekilde) Chat Widget'ı iliştir
    extend(HeaderSecondary.prototype, 'items', function (items) {
        items.add('direct-chat', <ChatWidget />, -100);
    });

    // 2. Kullanıcı profiline 'Mesaj Gönder' butonu ekle
    extend(UserPage.prototype, 'sidebarItems', function (items) {
        const user = this.user;
        if (!app.session.user || app.session.user === user) return;

        items.add('direct-message', (
            <Button
                className="Button Button--primary"
                icon="fas fa-paper-plane"
                onclick={() => {
                    const chatFunc = window.openFramioChatWith;
                    if (chatFunc && typeof chatFunc === 'function') {
                        chatFunc(user);
                    } else {
                        console.error('[DirectChat] Sohbet penceresi henüz hazır değil!');
                        // Alternatif: Baloncuğa tıklat
                        const bubble = document.querySelector('.FramioDirectChat-Wrapper .Button--primary');
                        if (bubble) bubble.click();
                    }
                }}
            >
                {app.translator.trans('framiodev-direct-chat.forum.user.message_button')}
            </Button>
        ), 100);
    });
});

