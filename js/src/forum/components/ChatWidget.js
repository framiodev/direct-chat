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
        
        this.boundOpenChat = this.openChatWithUser.bind(this);
        window.openFramioChatWith = this.boundOpenChat;
        window.openFramioChatWithText = (text) => {
            this.pendingText = text;
            this.messageText = text;
            this.isOpen = true;
            this.loadMessages(); // Listeyi getirmek için
            m.redraw();
        };
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
                    
                    if (!convos.has(otherId)) {
                        let otherUser = app.store.getById('users', otherId);
                        if (!otherUser && response.included) {
                            const includedUser = response.included.find(inc => inc.type === 'users' && inc.id === otherId);
                            if (includedUser) {
                                otherUser = app.store.pushObject(includedUser);
                            }
                        }
                        if (otherUser) {
                            convos.set(otherId, { user: otherUser, lastMessage: msg.attributes.message_text });
                        }
                    }
                    
                    // Eğer aktif olarak bir kullanıcı seçiliyse ve mesaj onunla aramızdaysa listeye ekle
                    if (this.activeUser && (senderId === this.activeUser.id() || receiverId === this.activeUser.id())) {
                        this.messages.push(msg);
                    }
                });
                
                this.conversations = Array.from(convos.values());
            }
            this.isLoading = false;
            m.redraw();
            this.scrollToBottom();
        });
    }

    sendMessage() {
        if (!this.messageText.trim() || !this.activeUser) return;
        
        const text = this.messageText;
        this.messageText = '';
        
        app.request({
            method: 'POST',
            url: app.forum.attribute('apiUrl') + '/direct-messages',
            body: { 
                data: {
                    attributes: {
                        message_text: text,
                        message_type: 'text',
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
                                            <strong>{this.activeUser.username()}</strong>
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
                                                
                                                return (
                                                    <div className={isMe ? 'FramioDirectChat-Message FramioDirectChat-Message--Sent' : 'FramioDirectChat-Message FramioDirectChat-Message--Received'}>
                                                        {type === 'image' && msg.attributes.attachment_url && (
                                                            <div className="FramioDirectChat-Media" style="margin-bottom: 5px;">
                                                                <img src={msg.attributes.attachment_url} style="max-width: 100%; border-radius: 8px;" alt="Image" />
                                                            </div>
                                                        )}
                                                        {msg.attributes.message_text}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    
                                    <div className="FramioDirectChat-ChatPane__Footer">
                                        <input type="file" id="FramioDirectChat-FileUpload" style="display:none;" onchange={(e) => this.uploadFile(e, 'file')} />
                                        <input type="file" id="FramioDirectChat-ImageUpload" style="display:none;" accept="image/*" onchange={(e) => this.uploadFile(e, 'image')} />
                                        
                                        <Button className="Button Button--icon Button--link AttachBtn" icon="fas fa-paperclip" title="Dosya Ekle" aria-label="Dosya Ekle" onclick={() => document.getElementById('FramioDirectChat-FileUpload').click()} />
                                        <Button className="Button Button--icon Button--link AttachBtn" icon="fas fa-image" title="Resim Gönder" aria-label="Resim Gönder" onclick={() => document.getElementById('FramioDirectChat-ImageUpload').click()} />
                                        
                                        <input 
                                            type="text" 
                                            placeholder="Bir mesaj yazın..."
                                            value={this.messageText}
                                            oninput={(e) => this.messageText = e.target.value}
                                            onkeypress={(e) => { if(e.key === 'Enter') this.sendMessage() }}
                                        />
                                        
                                        {this.messageText.trim() ? (
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
