import React from 'react';
import { TextInput, TouchableOpacity, Text, View } from 'react-native';
import { API, graphqlOperation } from "@aws-amplify/api";
import { useFocusEffect } from '@react-navigation/native';
import CryptoJS from "react-native-crypto-js";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import * as root from '../Root';
let table;
export default function SheetScreen({ route, navigation, refresh, setLoading }: any) {
    const [sheet, setSheet] = React.useState([]);
    const { colors } = useTheme();

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            onRefresh();
        }, [route.params])
    );

    let onRefresh = async () => {
        setLoading(true);
        let data = await API.graphql(graphqlOperation(`{
            files_by_pk(id: "${route.params.id}") {
              id
              content
              title
            }
          }
          `));
        try {
            if (data.data.files_by_pk.content) {
                let e2eResult = await AsyncStorage.getItem('e2e');
                let decrypted = CryptoJS.AES.decrypt(data.data.files_by_pk.content, e2eResult).toString(CryptoJS.enc.Utf8);
                data.data.files_by_pk.content = decrypted;
            }
        }
        catch (err) { console.log(err) }
        setSheet(data.data.files_by_pk);

        table.setData(data.data.files_by_pk.content ? JSON.parse(data.data.files_by_pk.content).data : []);
        table.setStyle(data.data.files_by_pk.content ? JSON.parse(data.data.files_by_pk.content).style : []);
        table.setWidth(data.data.files_by_pk.content ? JSON.parse(JSON.stringify(JSON.parse(data.data.files_by_pk.content).width).replace(/g\"/, '')) : []);
        setLoading(false);
    }

    React.useEffect(() => {
        table = window.jspreadsheet(document.getElementById('spreadsheet'), {
            toolbar: [
                {
                    type: 'i',
                    content: 'undo',
                    onclick: function () {
                        table.undo();
                    }
                },
                {
                    type: 'i',
                    content: 'redo',
                    onclick: function () {
                        table.redo();
                    }
                },
                {
                    type: 'i',
                    content: 'save',
                    onclick: function () {
                        table.download();
                    }
                },
                {
                    type: 'select',
                    k: 'font-family',
                    v: ['Arial', 'Verdana']
                },
                {
                    type: 'select',
                    k: 'font-size',
                    v: ['9px', '10px', '11px', '12px', '13px', '14px', '15px', '16px', '17px', '18px', '19px', '20px']
                },
                {
                    type: 'i',
                    content: 'format_align_left',
                    k: 'text-align',
                    v: 'left'
                },
                {
                    type: 'i',
                    content: 'format_align_center',
                    k: 'text-align',
                    v: 'center'
                },
                {
                    type: 'i',
                    content: 'format_align_right',
                    k: 'text-align',
                    v: 'right'
                },
                {
                    type: 'i',
                    content: 'format_bold',
                    k: 'font-weight',
                    v: 'bold'
                },
                {
                    type: 'color',
                    content: 'format_color_text',
                    k: 'color'
                },
                {
                    type: 'color',
                    content: 'format_color_fill',
                    k: 'background-color'
                },
            ],
            data: [[]],
            minDimensions: [40, 200]
        });
    }, []);

    const saveSheet = async () => {
        setLoading(true);
        let e2eResult = await AsyncStorage.getItem('e2e');
        let encrypted = CryptoJS.AES.encrypt(JSON.stringify({ data: table.getJson(), style: table.getStyle(), width: table.getWidth() }), e2eResult).toString();
        await API.graphql(graphqlOperation(`mutation($content: String, $title: String) {
            updateSheet: update_files_by_pk(pk_columns: {id: "${sheet.id}"}, _set: {content: $content, title: $title}) {id}
        }`, { content: encrypted, title: sheet.title }));
        setLoading(false);
    }

    return (
        <div>
            <View style={{ height: 100, padding: 10, paddingTop: root.desktopWeb ? 50 : 0, paddingBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <TouchableOpacity style={{ width: 20 }} onPress={() => {
                    navigation.goBack()
                }}><Text style={{ fontSize: 30, color: colors.text }}>←</Text></TouchableOpacity>
                <TextInput spellCheck={false} inputAccessoryViewID='main' style={[{ color: colors.text, fontSize: 20, textAlign: 'center', width: '50%' }]} value={sheet.title} onChangeText={(value) => {
                    setSheet({ ...sheet, title: value });
                }} onBlur={() => {
                    setSheet({ ...sheet });
                    saveSheet();
                }} />
                <div style={{ width: '10%' }}></div>
            </View>
            <div onBlur={() => { saveSheet(); }} id="spreadsheet" style={{ height: 'calc(100vh - 100px)', width: '100vw', overflow: 'scroll' }}></div>
        </div>
    )
}