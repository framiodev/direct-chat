import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import UserPage from 'flarum/forum/components/UserPage';
import Button from 'flarum/common/components/Button';
import ChatWidget from './components/ChatWidget';

app.initializers.add('framiodev/direct-chat', () => {
    // 1. Forumdan bağımsız bir kap (container) oluştur ve Body'ye ekle
    const chatContainer = document.createElement('div');
    chatContainer.id = 'framiodev-chat-root';
    document.body.appendChild(chatContainer);

    // ChatWidget'ı bu bağımsız kaba monte et
    setTimeout(() => {
        m.mount(chatContainer, { view: () => m(ChatWidget) });
    }, 0);

    // 2. Kullanıcı profiline 'Mesaj Gönder' butonu ekle
    extend(UserPage.prototype, 'sidebarItems', function (items) {
        const user = this.user;
        if (!app.session || !app.session.user || app.session.user === user) return;

        items.add('direct-message', (
            <Button
                className="Button Button--primary"
                icon="fas fa-paper-plane"
                onclick={() => {
                    const chatFunc = window.openFramioChatWith;
                    if (chatFunc && typeof chatFunc === 'function') {
                        chatFunc(user);
                    } else {
                        const bubble = document.querySelector('.FramioDirectChat-Wrapper');
                        if (bubble) {
                            if (window.openFramioChatWith) window.openFramioChatWith(user);
                        }
                    }
                }}
            >
                {app.translator.trans('framiodev-direct-chat.forum.user.message_button')}
            </Button>
        ), 100);
    });
});
