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
        
        this.boundOpenChat = this.openChatWithUser.bind(this);
        window.openFramioChatWith = this.boundOpenChat;
    }

    openChatWithUser(user) {
        this.activeUser = user;
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
            <div className={`FramioDirectChat-Wrapper ${this.isOpen ? 'open' : ''}`}>
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
                                <Button className="Button Button--icon Button--link" icon="fas fa-times" aria-label="Kapat" onclick={() => { this.isOpen = false; this.activeUser = null; }} />
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
                                                
                                                return (
                                                    <div className={isMe ? 'FramioDirectChat-Message FramioDirectChat-Message--Sent' : 'FramioDirectChat-Message FramioDirectChat-Message--Received'}>
                                                        {msg.attributes.message_text}
                                                    </div>
                                                );
                                            })
                                        )}
                                    </div>
                                    
                                    <div className="FramioDirectChat-ChatPane__Footer">
                                        <Button className="Button Button--icon Button--link AttachBtn" icon="fas fa-paperclip" title="Dosya Ekle (Yakında)" aria-label="Dosya Ekle" onclick={() => this.triggerFeatureNotReady('Dosya Ekleme')} />
                                        <Button className="Button Button--icon Button--link AttachBtn" icon="fas fa-image" title="Resim Gönder (Yakında)" aria-label="Resim Gönder" onclick={() => this.triggerFeatureNotReady('Resim Gönderimi')} />
                                        
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
