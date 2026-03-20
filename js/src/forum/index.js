import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import UserPage from 'flarum/forum/components/UserPage';
import Button from 'flarum/common/components/Button';
import ChatWidget from './components/ChatWidget';
import SessionDropdown from 'flarum/forum/components/SessionDropdown';
import CommentPost from 'flarum/forum/components/CommentPost';

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

    // 3. Kullanıcı menüsüne (Sağ üstteki dropdown) 'Mesajlarım' butonu ekle
    extend(SessionDropdown.prototype, 'items', function (items) {
        items.add('direct-messages', (
            <Button
                icon="fas fa-comment-dots"
                onclick={() => {
                    const chatFunc = window.openFramioChatWith;
                    if (chatFunc && typeof chatFunc === 'function') {
                        chatFunc(null); // null göndererek sadece sidebar'ı açarız
                    }
                }}
            >
                {app.translator.trans('framiodev-direct-chat.forum.chat.chat_platform') || 'Mesajlarım'}
            </Button>
        ), 50); // Çıkış yap butonundan önce çıkması için 50 önceliği
    });

    // 4. Forum Gönderilerine (Post) "İlet/Uçur" butonu ekle
    extend(CommentPost.prototype, 'actionItems', function (items) {
        const post = this.attrs.post;
        if (!app.session || !app.session.user) return;
        
        items.add('direct-message-share', (
            <Button
                className="Button Button--link"
                icon="fas fa-paper-plane"
                title="DM olarak gönder"
                onclick={() => {
                    const postUrl = app.forum.attribute('baseUrl') + '/d/' + post.discussion().id() + '/' + post.number();
                    
                    const snippet = post.contentPlain() ? post.contentPlain().substring(0, 100) + '...' : 'Gönderi önizlemesi';
                    
                    // Gönderide resim varsa yakala
                    const html = post.contentHtml() || '';
                    let imageUrl = null;
                    const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
                    if (imgMatch && imgMatch[1] && !imgMatch[1].includes('emoji')) {
                        imageUrl = imgMatch[1];
                    }

                    const embedData = {
                        title: post.discussion().title(),
                        content: snippet,
                        url: postUrl,
                        author: post.user() ? post.user().username() : 'Anonim',
                        avatar: post.user() ? post.user().avatarUrl() : null,
                        image: imageUrl
                    };

                    if (window.openFramioChatWithEmbed) {
                        window.openFramioChatWithEmbed('post_embed', embedData);
                    } else if (window.openFramioChatWithText) {
                        window.openFramioChatWithText(postUrl);
                    }
                }}
            >
                Sohbete Gönder
            </Button>
        ), 50);
    });
});
