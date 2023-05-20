let btn = '<a href=".">TOP</a>';
if (window.opener) {
    btn = '<button type="button" onclick="window.close()">閉じる</button>';
}
document.body.innerHTML = '<p style="margin:10px;border:2px solid silver;padding:10px;background-color:yellow;font-family:sans-serif;">地図の閲覧には Microsoft Edge、Google Chrome, Mozilla Firefox、Safari などの最新のブラウザをご利用下さい。Internet Explorer 11 のサポートは終了しました。' + btn + '</p>';
