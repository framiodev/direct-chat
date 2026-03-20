import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import Page from 'flarum/common/components/Page';
import UserControls from 'flarum/forum/utils/UserControls';
import UserPage from 'flarum/forum/components/UserPage';
import Button from 'flarum/common/components/Button';
import ChatWidget from './components/ChatWidget';

app.initializers.add('framiodev/direct-chat', () => {
    // 1. Sağ alta Chat Widget'ı ekle
    extend(Page.prototype, 'view', function (vdom) {
        if (!vdom || !Array.isArray(vdom.children)) return;
        vdom.children.push(<ChatWidget />);
    });

    // 2. Kullanıcı profiline 'Mesaj Gönder' butonu ekle
    extend(UserPage.prototype, 'sidebarItems', function (items) {
        const user = this.user;

        // Kendi profilimizdeysek veya giriş yapmamışsak butonu gösterme
        if (!app.session.user || app.session.user === user) return;

        items.add('direct-message', (
            <Button
                className="Button Button--primary"
                icon="fas fa-paper-plane"
                onclick={() => {
                    if (window.openFramioChatWith) {
                        window.openFramioChatWith(user);
                    }
                }}
            >
                Mesaj Gönder
            </Button>
        ), 100);
    });
});

