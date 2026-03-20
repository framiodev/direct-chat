import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';
import app from 'flarum/forum/app';
import m from 'flarum/common/mithril';

export default class ChatWidget extends Component {
    oninit(vnode) {
        super.oninit(vnode);
        this.isOpen = false;
        this.isLoading = false;
        this.messages = [];
        this.activeUser = null; // Aktif mesajlaşılan kullanıcı
        this.messageText = '';
        
        // Flarum'un her yerinden bu sohbet penceresinin hedeflenebilmesi için global bir tetikleyici.
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
        if (!app.session.user) return;
        this.isLoading = true;
        m.redraw();
        
        app.request({
            method: 'GET',
            url: app.forum.attribute('apiUrl') + '/direct-messages'
        }).then(response => {
            const userId = this.activeUser ? this.activeUser.id() : null;
            if (response && response.data) {
                // Burada API'den gelen mesajları inceler ve SADECE aktif sohbet ettiğimiz kişinin mesajlarını ayıklarız.
                this.messages = response.data.filter(msg => {
                    const senderId = msg.relationships.sender.data.id;
                    const receiverId = msg.relationships.receiver.data.id;
                    if (!userId) return true;
                    return (senderId === userId || receiverId === userId);
                });
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
                m.redraw();
                this.scrollToBottom();
            }
        });
    }

    scrollToBottom() {
        setTimeout(() => {
            const body = document.querySelector('.FramioDirectChat-Modal__Body');
            if (body) {
                body.scrollTop = body.scrollHeight;
            }
        }, 100);
    }

    view() {
        const myId = app.session.user ? app.session.user.id() : null;

        return (
            <div className="FramioDirectChat-Wrapper" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999;">
                <Button 
                    className="Button Button--primary" 
                    icon="fas fa-comments" 
                    style="border-radius: 50%; width: 60px; height: 60px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);"
                    onclick={() => {
                        this.isOpen = !this.isOpen;
                        if (this.isOpen && !this.activeUser) this.loadMessages();
                    }}
                >
                </Button>

                {this.isOpen && (
                    <div className="FramioDirectChat-Modal" style="position: absolute; bottom: 80px; right: 0;">
                        <div className="FramioDirectChat-Modal__Header">
                            <span>
                                {this.activeUser 
                                    ? app.translator.trans('framiodev-direct-chat.forum.chat.with_user', {username: this.activeUser.username()}) 
                                    : app.translator.trans('framiodev-direct-chat.forum.chat.chat_platform')}
                            </span>
                            <Button className="Button Button--icon Button--link" style="color: white;" icon="fas fa-times" onclick={() => this.isOpen = false} />
                        </div>
                        
                        <div className="FramioDirectChat-Modal__Body">
                            {this.isLoading ? (
                                <div style="padding: 20px; color: #666; text-align: center;">...</div>
                            ) : this.messages.length === 0 ? (
                                <div style="padding: 20px; color: #666; text-align: center;">
                                    {app.translator.trans('framiodev-direct-chat.forum.chat.empty_state')}
                                </div>
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
                        
                        {this.activeUser ? (
                            <div className="FramioDirectChat-Modal__Footer" style="display: flex; gap: 5px;">
                                <input 
                                    type="text" 
                                    placeholder={app.translator.trans('framiodev-direct-chat.forum.chat.placeholder')}
                                    value={this.messageText}
                                    oninput={(e) => this.messageText = e.target.value}
                                    onkeypress={(e) => { if(e.key === 'Enter') this.sendMessage() }}
                                />
                                <Button className="Button Button--primary" icon="fas fa-paper-plane" onclick={this.sendMessage.bind(this)} />
                            </div>
                        ) : (
                            <div className="FramioDirectChat-Modal__Footer" style="text-align: center; color: #888; font-size: 11px; padding: 15px;">
                                {app.translator.trans('framiodev-direct-chat.forum.chat.guide')}
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }
}
