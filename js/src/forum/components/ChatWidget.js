import Component from 'flarum/common/Component';
import Button from 'flarum/common/components/Button';

export default class ChatWidget extends Component {
    oninit(vnode) {
        super.oninit(vnode);
        // Sohbet penceresi ilk başta kapalı başlasın
        this.isOpen = false;
    }

    view() {
        return (
            <div className="FramioDirectChat-Wrapper" style="position: fixed; bottom: 20px; right: 20px; z-index: 9999;">
                {/* Sohbeti Açan/Kapatan Ana Yuvarlak Buton */}
                <Button 
                    className="Button Button--primary" 
                    icon="fas fa-comments" 
                    style="border-radius: 50%; width: 60px; height: 60px; box-shadow: 0 4px 10px rgba(0,0,0,0.2);"
                    onclick={() => this.isOpen = !this.isOpen}
                >
                </Button>

                {/* Butona basıldığında açılacak olan Sohbet Paneli */}
                {this.isOpen && (
                    <div className="FramioDirectChat-Modal" style="position: absolute; bottom: 80px; right: 0;">
                        <div className="FramioDirectChat-Modal__Header">
                            <span>Sohbetler</span>
                            <Button className="Button Button--icon Button--link" icon="fas fa-times" onclick={() => this.isOpen = false} />
                        </div>
                        
                        <div className="FramioDirectChat-Modal__Body">
                            <div className="text-center" style="color: #666; font-size: 13px;">
                                Mesajlaşmaya henüz başlamadınız...
                            </div>
                        </div>
                        
                        <div className="FramioDirectChat-Modal__Footer" style="display: flex;">
                            <input type="text" placeholder="Mesajınızı yazın..." />
                            <Button className="Button Button--primary" icon="fas fa-paper-plane" />
                        </div>
                    </div>
                )}
            </div>
        );
    }
}
