import app from 'flarum/forum/app';

app.initializers.add('framiodev/direct-chat', () => {
    // Flarum açıldığında konsolda test için bu mesajı göreceğiz.
    console.log('[Framiodev Chat] Eklentinin Arayüzü (Frontend) başarıyla yüklendi!');

    // TODO: Sağ alta "Mesajlar" butonunu ekleyeceğiz
    // TODO: Mesajlaşma kutusu (Modal/Popup) bileşenini dahil edeceğiz
});
