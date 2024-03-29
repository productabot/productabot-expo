import React from 'react';
import { TouchableOpacity, Platform, Image } from 'react-native';
import { Text, View } from '../components/Themed';
import { WebView } from 'react-native-webview';
import { useTheme } from '@react-navigation/native';

export default function InputComponent({ type, options, optionImage = false, optionCharacterImage = false, value, setValue, canClear = false, initialValue = null, width = '100%', marginTop = 0, fontSize = 20 }: any) {
    const { colors } = useTheme();
    const webViewRef = React.useRef(null);
    React.useEffect(() => {
        webViewRef.current?.injectJavaScript(`
            (function() {
                document.querySelector('#editor').value='${value}';
                ${optionImage && `document.querySelector('#image').src='https://files.productabot.com/public/${options.filter(obj => obj.id === value)[0]?.image}';`}
            })();
        `);
    }, [value]);
    const webFontSizeCoefficient = fontSize / 20;
    return (
        Platform.OS === 'web' ?
            (type === 'date' ?
                <div style={{ backgroundColor: colors.background, color: colors.text, borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, width: 'calc(' + width + ' - 12px)', fontFamily: 'arial', borderRadius: 10, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <input id={type} type={type} value={value} onChange={(e) => { setValue(e.target.value) }} style={{ backgroundColor: colors.background, color: colors.text, padding: 0, fontSize: 20, fontFamily: 'arial', border: 'none', width: 'calc(100% - 60px)' }} />
                    <button style={{ width: 50 }} onClick={() => { setValue(null); document.querySelector(`#${type}`).value = null; }}>clear</button>
                </div>
                : type === 'time' ?
                    <div style={{ backgroundColor: colors.background, color: colors.text, borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 5, marginTop: 5, marginBottom: 5, fontSize: 20, width: 'calc(' + width + ' - 12px)', fontFamily: 'arial', borderRadius: 10, display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <select id={type} style={{ color: colors.text, fontSize: fontSize, backgroundColor: colors.background, borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', width: '100%', border: 'none' }} value={value} onChange={(e) => { setValue(e.target.value) }}>
                            <option value={''}>{`--:-- --`}</option>
                            {[8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 0, 1, 2, 3, 4, 5, 6, 7].map(hour =>
                                <>
                                    {['00', '15', '30', '45'].map(minute => <option value={`${String(hour).padStart(2, '0')}:${minute}:00`}>{`${hour < 12 ? `${hour === 0 ? 12 : hour}:${minute}am` : `${(hour === 12 ? 12 : hour - 12)}:${minute}pm`}`}</option>)}
                                </>
                            )}
                        </select>
                        <button style={{ width: 50 }} onClick={() => { setValue(null); document.querySelector(`#${type}`).value = ''; }}>clear</button>
                    </div>
                    : type === 'select' ?
                        <div style={{ width: width, display: 'inline-block', position: 'relative' }}>
                            {optionImage && <img style={{ position: 'absolute', top: 10, left: 6, width: webFontSizeCoefficient * 25, height: webFontSizeCoefficient * 25, border: `1px solid ${colors.border}`, borderRadius: 5, objectFit: 'cover' }} src={`https://files.productabot.com/public/${options.filter(obj => obj.id === value)[0]?.image ?? 'blank.png'}`} />}
                            {optionCharacterImage && <div style={{ position: 'absolute', zIndex: 1, color: colors.text }}>
                                {value === '' && <div style={{ fontSize: webFontSizeCoefficient * 60, marginLeft: 1, marginTop: -16 }}>○</div>}
                                {value === 'low' && <div style={{ fontSize: webFontSizeCoefficient * 34, marginLeft: 4, marginTop: 1 }}>⨀</div>}
                                {value === 'medium' && <div style={{ fontSize: webFontSizeCoefficient * 32, marginLeft: 4, marginTop: 2 }}>⦿</div>}
                                {value === 'high' && <div style={{ fontSize: webFontSizeCoefficient * 60, marginTop: -16, marginLeft: 1 }}>●</div>}
                                {value === 'backlog' && <div style={{ fontSize: webFontSizeCoefficient * 36, marginLeft: 4, marginTop: 2 }}>◔</div>}
                                {value === 'selected' && <div style={{ fontSize: webFontSizeCoefficient * 36, marginLeft: 4, marginTop: 2 }}>◑</div>}
                                {value === 'in_progress' && <div style={{ fontSize: webFontSizeCoefficient * 36, marginLeft: 4, marginTop: 2 }}>◕</div>}
                                {value === 'done' && <div style={{ fontSize: webFontSizeCoefficient * 60, marginTop: -15, marginLeft: 1 }}>●</div>}
                            </div>}
                            <select style={{ color: colors.text, fontSize: fontSize, padding: 5, backgroundColor: colors.background, borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', marginTop: 5, marginBottom: 5, width: '100%', borderRadius: 10, paddingLeft: (optionImage || optionCharacterImage) ? webFontSizeCoefficient * 35 : 0 }} value={value} onChange={(e) => { setValue(e.target.value) }}>
                                {options.map(obj => <option value={obj.id}>{obj.name}</option>)}
                            </select>
                        </div>
                        : <div />)
            :
            <View style={{ backgroundColor: colors.background, borderWidth: 1, borderColor: '#666666', borderStyle: 'solid', padding: 0, marginTop: 5, marginBottom: 5, height: 30, width: width, borderRadius: 10 }}>
                {(canClear && value || !canClear) ?
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', height: '100%' }}>
                        {optionCharacterImage &&
                            <View style={{ width: 30, paddingLeft: 2 }}>
                                {value === 'low' && <Text style={{ textAlign: 'center', fontSize: 32, marginTop: 4 }}>⨀</Text>}
                                {value === 'medium' && <Text style={{ textAlign: 'center', fontSize: 42, marginTop: 1 }}>⦿</Text>}
                                {value === 'high' && <Text style={{ textAlign: 'center', fontSize: 30, marginTop: -1 }}>●</Text>}
                                {value === 'backlog' && <Text style={{ textAlign: 'center', fontSize: 40, marginTop: -8 }}>◔</Text>}
                                {value === 'selected' && <Text style={{ textAlign: 'center', fontSize: 30, marginTop: -1 }}>◑</Text>}
                                {value === 'in_progress' && <Text style={{ textAlign: 'center', fontSize: 40, marginTop: -8 }}>◕</Text>}
                                {value === 'done' && <Text style={{ textAlign: 'center', fontSize: 30, marginTop: -1 }}>●</Text>}
                            </View>}
                        <WebView
                            ref={webViewRef}
                            style={{ borderRadius: 10, backgroundColor: 'transparent' }}
                            source={{
                                html: `
                                    <head>
                                    <meta name="viewport" content="width=device-width; initial-scale=1.0; maximum-scale=1.0; user-scalable=no;" />
                                    <style>
                                    input::-webkit-date-and-time-value{text-align:left;margin-left:5px;text-transform:lowercase;}
                                    </style>
                                    </head>
                                    <body style="background-color:${colors.background};margin:0px;padding:5px;display:flex;flex-direction:row;">
                                    ${['date', 'time'].includes(type) ?
                                        `<input style="all:unset;width:100%;height:100%;background-color:${colors.background};color:${colors.text};font-family:arial;" id="editor" onchange="window.ReactNativeWebView.postMessage(document.querySelector('#editor').value)" type="${type}" value="${value ?? (type === 'time' ? '00:00' : null)}" />`
                                        : ``}
                                        
                                    ${optionImage ? `
                                    <img id="image" style="height:22px;width:22px;border-radius:5px;border-color:${colors.text};border-width:1px;border-style:solid;margin-top:-3px;margin-right:5px;"/>`
                                        : ``}
                                    ${type === 'select' ?
                                        `<select style="all:unset;width:80%;height:100%;background-color:${colors.background};color:${colors.text};font-family:arial;margin-top:${marginTop}px;" id="editor" 
                                    onchange="window.ReactNativeWebView.postMessage(document.querySelector('#editor').value)">
                                    ${options.map(obj => `<option value="${obj.id}">${obj.name}</option>`)}
                                    </select>`
                                        : ``}
                                    </body>
                                `}}
                            keyboardDisplayRequiresUserAction={false}
                            showsHorizontalScrollIndicator={false}
                            scrollEnabled={false}
                            scalesPageToFit={false}
                            javaScriptEnabled={true}
                            automaticallyAdjustContentInsets={false}
                            onMessage={async (e) => {
                                let value = e.nativeEvent.data;
                                setValue(value);
                            }}
                            injectedJavaScript={`
                            (function() {
                                document.querySelector('#editor').value='${value}';
                                ${optionImage && `document.querySelector('#image').src='https://files.productabot.com/public/${options.filter(obj => obj.id === value)[0]?.image}';`}
                            })();
                            `}
                        />
                        {canClear &&
                            <TouchableOpacity onPress={() => { setValue(null) }} style={{ flexDirection: 'row', alignItems: 'center', height: '100%', paddingRight: 10 }}><Text>clear</Text></TouchableOpacity>}
                    </View>
                    :
                    <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', height: '100%', paddingLeft: 10 }} onPress={() => setValue(initialValue)}><Text>tap to set {type}</Text></TouchableOpacity>
                }
            </View>
    );
}