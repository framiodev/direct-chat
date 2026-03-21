import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import app from 'flarum/forum/app';

export default class ChatWidget extends Component {
    oninit(vnode) {
        super.oninit(vnode);
        this.isOpen = false;
        this.isLoading = false;
        this.messages = [];
        this.conversations = []; // { user: User, lastMessage: string }
        this.activeUser = null;
        this.messageText = '';
        this.pendingText = ''; // Dışarıdan gelen varsayılan mesaj (Örn: Post yönlendirme)
        this.pendingEmbed = null; // Zengin önizleme verisi
        this.isTyping = false;
        this.typingTimer = null;
        this.otherIsTyping = false;
        this.otherTypingTimer = null;
        
        this.boundOpenChat = this.openChatWithUser.bind(this);
        window.openFramioChatWith = this.boundOpenChat;
        window.openFramioChatWithText = (text) => {
            this.pendingText = text;
            this.messageText = text;
            this.isOpen = true;
            this.loadMessages(); // Listeyi getirmek için
            m.redraw();
        };
        window.openFramioChatWithEmbed = (type, data) => {
            this.pendingEmbed = { type, data };
            this.isOpen = true;
            this.loadMessages();
            m.redraw();
        };

        if (app.session && app.session.user) {
            this.setupPusher();
        }
    }

    setupPusher() {
        setTimeout(() => {
            if (!app.pusher) return;
            
            const myId = app.session.user.id();
            const channelName = 'private-user' + myId;
            
            // Flarum kendi pusher kanalına bağlandığında biz de olay dinleyicisi ekleriz
            const channel = app.pusher.channel(channelName) || app.pusher.subscribe(channelName);
            
            channel.bind('framiodev.direct-chat.new-message', (data) => {
                // Yeni bir mesaj geldiğinde listeyi sessizce güncelle
                this.loadMessages(); // Bu fonksiyon mesajı yüklüyor ve zaten read olayını eklentilerse tetikleyecek
            });
            
            channel.bind('framiodev.direct-chat.messages-read', (data) => {
                // Karşı taraf bizim mesajlarımızı okudu, ekrandaki tikleri mavi yap
                if (data.readerId) {
                    const readerIdStr = data.readerId.toString();
                    let updated = false;
                    this.messages.forEach(msg => {
                        if (msg.relationships.receiver && msg.relationships.receiver.data.id === readerIdStr && !msg.attributes.is_read) {
                            msg.attributes.is_read = 1;
                            updated = true;
                        }
                    });
                    if (updated) m.redraw();
                }
            });
            
            channel.bind('framiodev.direct-chat.typing', (data) => {
                if (data.userId && this.activeUser && this.activeUser.id() === data.userId.toString()) {
                    this.otherIsTyping = true;
                    m.redraw();
                    
                    clearTimeout(this.otherTypingTimer);
                    this.otherTypingTimer = setTimeout(() => {
                        this.otherIsTyping = false;
                        m.redraw();
                    }, 2000);
                }
            });
        }, 1500); // Flarum core'un pusher'ı bind etmesini beklemek için küçük bir gecikme
    }

    markConversationAsRead() {
        if (!this.activeUser || !app.session || !app.session.user) return;
        
        const myId = app.session.user.id();
        const hasUnread = this.messages.some(msg => msg.relationships.receiver && msg.relationships.receiver.data.id === myId && !msg.attributes.is_read);
        
        if (hasUnread) {
            app.request({
                method: 'POST',
                url: app.forum.attribute('apiUrl') + '/direct-messages/read',
                body: {
                    data: { attributes: { sender_id: this.activeUser.id() } }
                }
            }).then(() => {
                this.messages.forEach(msg => {
                    if (msg.relationships.receiver && msg.relationships.receiver.data.id === myId) {
                        msg.attributes.is_read = 1;
                    }
                });
                m.redraw();
            });
        }
    }

    openChatWithUser(user, prefilledText = '') {
        this.activeUser = user;
        if (prefilledText) {
            this.messageText = prefilledText;
        } else if (this.pendingText) {
            this.messageText = this.pendingText;
            this.pendingText = ''; // Kullanıldı, temizle
        }
        
        this.isOpen = true;
        this.loadMessages();
        m.redraw();
    }

    loadMessages() {
        if (!app.session || !app.session.user) return;
        this.isLoading = true;
        m.redraw();
        
        app.request({
            method: 'GET',
            url: app.forum.attribute('apiUrl') + '/direct-messages'
        }).then(response => {
            if (response && response.data) {
                const myId = app.session.user.id();
                
                // Geri dönen mesajlardan sohbet geçmişini (Sidebar) oluştur
                const convos = new Map();
                const rawMessages = response.data;
                
                this.messages = [];
                
                rawMessages.forEach(msg => {
                    const senderData = msg.relationships && msg.relationships.sender ? msg.relationships.sender.data : null;
                    const receiverData = msg.relationships && msg.relationships.receiver ? msg.relationships.receiver.data : null;
                    
                    if (!senderData || !receiverData) return;
                    
                    const senderId = senderData.id;
                    const receiverId = receiverData.id;
                    
                    // Bizim dışımızdaki karşı taraf kullanıcısı
                    const otherId = senderId === myId ? receiverId : senderId;
                    
                    let otherUser = app.store.getById('users', otherId);
                    if (!otherUser && response.included) {
                        const includedUser = response.included.find(inc => inc.type === 'users' && inc.id === otherId);
                        if (includedUser) {
                            otherUser = app.store.pushObject(includedUser);
                        }
                    }

                    if (otherUser) {
                        let textParams = msg.attributes.message_text;
                        if (msg.attributes.message_type === 'post_embed') {
                            try {
                                const p = JSON.parse(textParams);
                                textParams = p.userText ? "Bağlantı: " + p.userText : "🚀 Bir gönderi paylaştı.";
                            } catch(e) {
                                textParams = "📎 Gönderi Paylaşımı";
                            }
                        } else if (msg.attributes.message_type === 'image') {
                            textParams = "📷 Resim";
                        } else if (msg.attributes.message_type === 'file') {
                            textParams = "📁 Dosya";
                        }
                        
                        const msgTime = new Date(msg.attributes.createdAt).getTime() || 0;
                        const existing = convos.get(otherId);
                        
                        // En son/yeni mesaja göre sidebar'ı güncelle (en güncel message_text görünsün)
                        if (!existing || msgTime >= existing.lastTime) {
                            convos.set(otherId, { 
                                user: otherUser, 
                                lastMessage: textParams,
                                lastTime: msgTime
                            });
                        }
                    }
                    
                    // Eğer aktif olarak bir kullanıcı seçiliyse ve mesaj onunla aramızdaysa listeye ekle
                    if (this.activeUser && (senderId === this.activeUser.id() || receiverId === this.activeUser.id())) {
                        this.messages.push(msg);
                    }
                });
                
                // Sohbetleri son mesaj saatine göre sırala
                this.conversations = Array.from(convos.values()).sort((a, b) => b.lastTime - a.lastTime);
            }
            this.isLoading = false;
            m.redraw();
            this.scrollToBottom();
        });
    }

    sendMessage() {
        if (!this.messageText.trim() && !this.pendingEmbed) return;
        if (!this.activeUser) return;
        
        let text = this.messageText;
        let msgType = 'text';
        this.messageText = '';
        
        if (this.pendingEmbed) {
            msgType = this.pendingEmbed.type; // 'post_embed'
            text = JSON.stringify({
                userText: text,
                embed: this.pendingEmbed.data
            });
            this.pendingEmbed = null;
        }
        
        app.request({
            method: 'POST',
            url: app.forum.attribute('apiUrl') + '/direct-messages',
            body: { 
                data: {
                    attributes: {
                        message_text: text,
                        message_type: msgType,
                        receiver_id: this.activeUser.id()
                    }
                }
            }
        }).then(response => {
            if (response && response.data) {
                this.messages.push(response.data);
                this.loadMessages(); // Konuşma listesinin de güncellenmesi için
            }
        });
    }

    uploadFile(event, type) {
        if (!this.activeUser) return;
        const file = event.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        
        this.isLoading = true;
        m.redraw();

        app.request({
            method: 'POST',
            url: app.forum.attribute('apiUrl') + '/direct-messages/upload',
            serialize: raw => raw,
            body: formData
        }).then(response => {
            if (response && response.url) {
                app.request({
                    method: 'POST',
                    url: app.forum.attribute('apiUrl') + '/direct-messages',
                    body: { 
                        data: {
                            attributes: {
                                message_text: type === 'image' ? '📷 Resim gönderildi' : '📁 Dosya gönderildi',
                                message_type: type,
                                attachment_url: app.forum.attribute('baseUrl') + response.url,
                                receiver_id: this.activeUser.id()
                            }
                        }
                    }
                }).then(resp => {
                    if (resp && resp.data) {
                        this.messages.push(resp.data);
                        this.loadMessages();
                    }
                });
            } else {
                this.isLoading = false;
                alert('Dosya yüklenemedi!');
                m.redraw();
            }
        }).catch(e => {
            this.isLoading = false;
            alert('Yükleme hatası oluştu!');
            m.redraw();
        });
        
        // Input'u sıfırla ki aynı dosyayı bir daha seçmek isterse çalışsın
        event.target.value = '';
    }

    scrollToBottom() {
        setTimeout(() => {
            const body = document.querySelector('.FramioDirectChat-ChatPane__Body');
            if (body) {
                body.scrollTop = body.scrollHeight;
            }
        }, 100);
    }

    // Gelecek aşamalar için Placeholder uyarı metodu
    triggerFeatureNotReady(featureName) {
        alert(`${featureName} özelliği Aşama 2 ve sonrasında aktif edilecek!`);
    }

    formatText(text) {
        if (!text) return '';
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.split(urlRegex).map((part, i) => {
            if (part.match(urlRegex)) {
                return (
                    <a href={part} target="_blank" rel="noopener noreferrer" style="color: #0084ff; text-decoration: underline;">
                        {part}
                    </a>
                );
            }
            return part;
        });
    }

    view() {
        const myId = (app.session && app.session.user) ? app.session.user.id() : null;

        return (
            <div className={`FramioDirectChat-Wrapper ${this.isOpen ? 'open' : ''}`} onclick={(e) => {
                if (e.target.classList.contains('FramioDirectChat-Wrapper')) {
                    this.isOpen = false;
                    m.redraw();
                }
            }}>
                {!this.isOpen && (
                    <Button 
                        className="Button Button--primary FramioDirectChat-Trigger" 
                        icon="fas fa-comment-dots" 
                        aria-label="Sohbeti Aç"
                        onclick={() => {
                            this.isOpen = true;
                            this.loadMessages();
                        }}
                    />
                )}

                {this.isOpen && (
                    <div className="FramioDirectChat-AppTemplate">
                        {/* Sol Panel: Konuşmalar Listesi */}
                        <div className={`FramioDirectChat-Sidebar ${this.activeUser ? 'is-hidden-mobile' : ''}`}>
                            <div className="FramioDirectChat-Sidebar__Header">
                                <h3>Sohbetler</h3>
                                <Button className="Button Button--icon Button--link" icon="fas fa-times" aria-label="Kapat" onclick={(e) => { e.stopPropagation(); this.isOpen = false; this.activeUser = null; m.redraw(); }} />
                            </div>
                            <div className="FramioDirectChat-Sidebar__List">
                                {this.conversations.length === 0 && !this.isLoading && (
                                    <div className="FramioDirectChat-Empty">Henüz mesajınız yok.</div>
                                )}
                                {this.conversations.map(convo => (
                                    <div 
                                        className={`FramioDirectChat-Contact ${this.activeUser && this.activeUser.id() === convo.user.id() ? 'active' : ''}`}
                                        onclick={() => this.openChatWithUser(convo.user)}
                                    >
                                        <div className="Avatar">
                                            {convo.user.avatarUrl() ? <img src={convo.user.avatarUrl()} alt="Avatar"/> : <span className="Avatar-initials">{convo.user.username().charAt(0).toUpperCase()}</span>}
                                        </div>
                                        <div className="Info">
                                            <strong>{convo.user.username()}</strong>
                                            <span className="LastMessage">{convo.lastMessage || '...'}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sağ Panel: Aktif Sohbet */}
                        <div className={`FramioDirectChat-ChatPane ${this.activeUser ? 'is-active' : ''}`}>
                            {this.activeUser ? (
                                <>
                                    <div className="FramioDirectChat-ChatPane__Header">
                                        <div className="UserInfo">
                                            <Button className="Button Button--icon Button--link BackBtn" icon="fas fa-arrow-left" aria-label="Geri" onclick={() => this.activeUser = null} />
                                            <div className="Avatar">
                                                {this.activeUser.avatarUrl() ? <img src={this.activeUser.avatarUrl()} alt="Avatar" /> : <span className="Avatar-initials">{this.activeUser.username().charAt(0).toUpperCase()}</span>}
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                <strong>{this.activeUser.username()}</strong>
                                                <span style={{ fontSize: '11px', opacity: 0.8, fontWeight: 500 }}>
                                                    {this.otherIsTyping 
                                                        ? 'yazıyor...' 
                                                        : (this.activeUser.lastSeenAt && this.activeUser.lastSeenAt() 
                                                            ? ((new Date() - new Date(this.activeUser.lastSeenAt()) < 5 * 60 * 1000) 
                                                                ? <span style={{ color: '#00c853' }}>Çevrimiçi</span> 
                                                                : 'Son görülme: ' + new Date(this.activeUser.lastSeenAt()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}))
                                                            : ''
                                                        )
                                                    }
                                                </span>
                                            </div>
                                        </div>
                                        <div className="ChatActions">
                                            <Button className="Button Button--icon Button--link" icon="fas fa-phone" aria-label="Sesli Arama" onclick={() => this.triggerFeatureNotReady('Sesli Arama')} />
                                            <Button className="Button Button--icon Button--link" icon="fas fa-video" aria-label="Görüntülü Arama" onclick={() => this.triggerFeatureNotReady('Görüntülü Arama')} />
                                        </div>
                                    </div>
                                    
                                    <div className="FramioDirectChat-ChatPane__Body">
                                        {this.isLoading ? (
                                            <div className="FramioDirectChat-Loading"><i className="fas fa-spinner fa-spin"></i> Yükleniyor...</div>
                                        ) : this.messages.length === 0 ? (
                                            <div className="FramioDirectChat-Empty">Burada hiç mesaj yok. İlk mesajı siz gönderin!</div>
                                        ) : (
                                            this.messages.map(msg => {
                                                const senderId = msg.relationships.sender.data.id;
                                                const isMe = senderId === myId;
                                                const type = msg.attributes.message_type || 'text';
                                                
                                                let content;
                                                if (type === 'post_embed') {
                                                    try {
                                                        const parsed = JSON.parse(msg.attributes.message_text);
                                                        content = (
                                                            <div className="FramioDirectChat-EmbedWrapper">
                                                                <div className="FramioDirectChat-EmbedCard" onclick={() => window.open(parsed.embed.url, '_blank')}>
                                                                    <div className="EmbedCard-Header">
                                                                        {parsed.embed.avatar ? <img src={parsed.embed.avatar}/> : <i className="fas fa-user-circle"/>}
                                                                        <strong>{parsed.embed.author}</strong>
                                                                    </div>
                                                                    {parsed.embed.title && <div className="EmbedCard-Title">{parsed.embed.title}</div>}
                                                                    {parsed.embed.image && <div className="EmbedCard-Image" style="margin-bottom:6px;"><img src={parsed.embed.image} style="max-width:100%; border-radius:6px; max-height: 120px; object-fit: cover;" alt="Preview" /></div>}
                                                                    {parsed.embed.content && <div className="EmbedCard-Content">{parsed.embed.content}</div>}
                                                                </div>
                                                                {parsed.userText && <div className="EmbedCard-UserText">{this.formatText(parsed.userText)}</div>}
                                                            </div>
                                                        );
                                                    } catch(e) {
                                                        content = this.formatText(msg.attributes.message_text);
                                                    }
                                                } else {
                                                    content = this.formatText(msg.attributes.message_text);
                                                }

                                                let timeStr = "";
                                                if (msg.attributes.createdAt) {
                                                    timeStr = new Date(msg.attributes.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                                                }
                                                
                                                return (
                                                    <div className={isMe ? 'FramioDirectChat-Message FramioDirectChat-Message--Sent' : 'FramioDirectChat-Message FramioDirectChat-Message--Received'}>
                                                        {type === 'image' && msg.attributes.attachment_url && (
                                                            <div className="FramioDirectChat-Media" style="margin-bottom: 5px;">
                                                                <img src={msg.attributes.attachment_url} style="max-width: 100%; border-radius: 8px;" alt="Image" />
                                                            </div>
                                                        )}
                                                        {type === 'file' && msg.attributes.attachment_url && (
                                                            <div className="FramioDirectChat-File" style="margin-bottom: 5px;">
                                                                <a href={msg.attributes.attachment_url} target="_blank" className="Button Button--primary" style="font-size: 11px;"><i className="fas fa-download"></i> İndir</a>
                                                            </div>
                                                        )}
                                                        <div className="MessageContent">{content}</div>
                                                        <div className="MessageTime" style={{ fontSize: '10px', textAlign: 'right', opacity: 0.8, marginTop: '3px', fontWeight: 600 }}>
                                                            {timeStr}
                                                            {isMe && <i className="fas fa-check-double" style={{ marginLeft: '5px', color: msg.attributes.is_read ? '#34b7f1' : '#b2b2b2' }}></i>}
                                                        </div>
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    
                                    {this.pendingEmbed && (
                                        <div className="FramioDirectChat-PendingPreview">
                                            <div className="FramioDirectChat-EmbedCard">
                                                <div className="EmbedCard-Title">{this.pendingEmbed.data.title}</div>
                                                {this.pendingEmbed.data.image && <div className="EmbedCard-Image" style="margin-bottom:6px;"><img src={this.pendingEmbed.data.image} style="max-height: 80px; border-radius:6px; object-fit: cover;" alt="Preview" /></div>}
                                                <div className="EmbedCard-Content">{this.pendingEmbed.data.content}</div>
                                            </div>
                                            <Button className="Button Button--icon Button--link CancelPreviewBtn" icon="fas fa-times" onclick={() => this.pendingEmbed = null} />
                                        </div>
                                    )}

                                    <div className="FramioDirectChat-ChatPane__Footer">
                                        <input type="file" id="FramioDirectChat-FileUpload" style="display:none;" onchange={(e) => this.uploadFile(e, 'file')} />
                                        <input type="file" id="FramioDirectChat-ImageUpload" style="display:none;" accept="image/*" onchange={(e) => this.uploadFile(e, 'image')} />
                                        
                                        <Button className="Button Button--icon Button--link AttachBtn" icon="fas fa-paperclip" title="Dosya Ekle" aria-label="Dosya Ekle" onclick={() => document.getElementById('FramioDirectChat-FileUpload').click()} />
                                        <Button className="Button Button--icon Button--link AttachBtn" icon="fas fa-image" title="Resim Gönder" aria-label="Resim Gönder" onclick={() => document.getElementById('FramioDirectChat-ImageUpload').click()} />
                                        
                                        <input 
                                            type="text" 
                                            placeholder="Bir mesaj yazın..."
                                            value={this.messageText}
                                            oninput={(e) => {
                                                this.messageText = e.target.value;
                                                clearTimeout(this.typingTimer);
                                                if (!this.isTyping && this.activeUser) {
                                                    this.isTyping = true;
                                                    app.request({
                                                        method: 'POST',
                                                        url: app.forum.attribute('apiUrl') + '/direct-messages/typing',
                                                        body: { data: { attributes: { receiver_id: this.activeUser.id() } } }
                                                    }).catch(() => {});
                                                }
                                                this.typingTimer = setTimeout(() => { this.isTyping = false; }, 2000);
                                            }}
                                            onkeypress={(e) => { if(e.key === 'Enter') this.sendMessage() }}
                                        />
                                        
                                        {(this.messageText.trim() || this.pendingEmbed) ? (
                                            <Button className="Button Button--primary SendBtn" icon="fas fa-paper-plane" aria-label="Gönder" onclick={this.sendMessage.bind(this)} />
                                        ) : (
                                            <Button className="Button Button--icon Button--link VoiceBtn" icon="fas fa-microphone" title="Ses Kaydı (Yakında)" aria-label="Ses Kaydı" onclick={() => this.triggerFeatureNotReady('Ses Kaydı')} />
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="FramioDirectChat-NoUserSelected">
                                    <div className="PlaceholderIcon"><i className="fab fa-whatsapp"></i></div>
                                    <h3>Framiodev Web Chat</h3>
                                    <p>Mesajlaşmak için sol menüden bir konuşma seçin veya başka bir kullanıcının profiline giderek "Mesaj Gönder" butonuna tıklayarak yeni bir sohbet başlatın.</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }
}
