import app from 'flarum/forum/app';
import { extend } from 'flarum/common/extend';
import Page from 'flarum/common/components/Page';
import ChatWidget from './components/ChatWidget';

app.initializers.add('framiodev/direct-chat', () => {
    // Flarum'un ana ekranı (Page) her yüklendiğinde, bizim sohbet kutusunu da sayfanın içine enjekte eder.
    extend(Page.prototype, 'view', function (vdom) {
        if (!vdom || !Array.isArray(vdom.children)) return;
        vdom.children.push(<ChatWidget />);
    });
});

