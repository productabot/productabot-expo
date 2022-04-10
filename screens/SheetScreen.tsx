import React from 'react';
import { TextInput, TouchableOpacity, Text, View } from 'react-native';
import { API, graphqlOperation } from "@aws-amplify/api";
import { useFocusEffect } from '@react-navigation/native';
import CryptoJS from "react-native-crypto-js";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '@react-navigation/native';
import * as root from '../Root';
let table, sheetId, sheetTitle;
let parsedData = {};
export default function SheetScreen({ route, navigation, refresh, setLoading }: any) {
    const [sheet, setSheet] = React.useState([]);
    const { colors } = useTheme();

    useFocusEffect(
        React.useCallback(() => {
            if (!route.params) { route.params = {}; }
            document.getElementById('spreadsheet').style.visibility = 'hidden';
            onRefresh();
            return () => {
                saveSheet();
            }
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
        sheetId = data.data.files_by_pk.id;
        sheetTitle = data.data.files_by_pk.title;
        try {
            parsedData = JSON.parse(data.data.files_by_pk.content);
        }
        catch (err) {
            console.log(err);
        }
        if (parsedData.style) {
            setTimeout(() => { try { table.setStyle(parsedData.style); } catch (err) { console.log(err) } }, 0);
        }
        if (parsedData.width) {
            setTimeout(() => { try { table.setWidth(Array.from(Array(parsedData.width.length).keys()), parsedData.width); } catch (err) { console.log(err) } }, 0);
        }
        if (parsedData.columns) {
            table.options.columns = parsedData.columns
        }
        if (parsedData.data) {
            table.options.data = parsedData.data;
        }
        table.setData();
        setTimeout(() => { document.getElementById('spreadsheet').style.visibility = 'initial'; }, 0);
        setLoading(false);
    }

    const saveSheet = async () => {
        setLoading(true);
        let e2eResult = await AsyncStorage.getItem('e2e');
        let encrypted = CryptoJS.AES.encrypt(JSON.stringify({ data: table.getJson(), style: table.getStyle(), width: table.getWidth(), columns: table.options.columns }), e2eResult).toString();
        await API.graphql(graphqlOperation(`mutation($content: String, $title: String) {
            updateSheet: update_files_by_pk(pk_columns: {id: "${sheetId}"}, _set: {content: $content, title: $title}) {id}
        }`, { content: encrypted, title: sheetTitle }));
        setLoading(false);
    }

    const reloadTable = () => {
        let style = table.getStyle();
        let width = table.getWidth();
        table.setData();
        table.setStyle(style);
        table.setWidth(Array.from(Array(width.length).keys()), width);
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
                        saveSheet();
                    }
                },
                {
                    type: 'i',
                    content: 'file_download',
                    onclick: function () {
                        table.download();
                    }
                },
                {
                    type: 'select',
                    k: 'font-family',
                    v: ['Arial', 'Monospace', 'Verdana']
                },
                {
                    type: 'i',
                    content: 'title',
                    onclick: function (e) {
                        let columns = table.getSelectedColumns();
                        for (const column of columns) {
                            table.options.columns[column].type = 'text';
                            table.options.columns[column].mask = '';
                            table.options.columns[column].decimal = '';
                        }
                        reloadTable();
                    }
                },
                {
                    type: 'i',
                    content: 'tag',
                    onclick: function (e) {
                        let columns = table.getSelectedColumns();
                        for (const column of columns) {
                            table.options.columns[column].type = 'numeric';
                            table.options.columns[column].mask = '';
                            table.options.columns[column].decimal = '';
                        }
                        reloadTable();
                    }
                },
                {
                    type: 'i',
                    content: 'paid',
                    onclick: function (e) {
                        let columns = table.getSelectedColumns();
                        for (const column of columns) {
                            table.options.columns[column].type = 'numeric';
                            table.options.columns[column].mask = '0.00';
                            table.options.columns[column].decimal = '.';
                        }
                        reloadTable();
                    }
                },
                {
                    type: 'i',
                    content: 'percent',
                    onclick: function (e) {
                        let columns = table.getSelectedColumns();
                        for (const column of columns) {
                            table.options.columns[column].type = 'numeric';
                            table.options.columns[column].mask = '0.00%';
                            table.options.columns[column].decimal = '';
                        }
                        reloadTable();
                    }
                },
                {
                    type: 'i',
                    content: 'check',
                    onclick: function (e) {
                        let columns = table.getSelectedColumns();
                        for (const column of columns) {
                            table.options.columns[column].type = 'checkbox';
                            table.options.columns[column].mask = '';
                            table.options.columns[column].decimal = '';
                        }
                        reloadTable();
                    }
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
            minDimensions: [37, 50]
        });
    }, []);

    return (
        <div>
            <View style={{ height: 100, padding: 10, paddingTop: root.desktopWeb ? 50 : 0, paddingBottom: 0, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <TouchableOpacity style={{ width: 20 }} onPress={() => {
                    navigation.goBack()
                }}><Text style={{ fontSize: 30, color: colors.text }}>←</Text></TouchableOpacity>
                <TextInput placeholderTextColor={colors.placeholder} spellCheck={false} inputAccessoryViewID='main' style={[{ color: colors.text, fontSize: 20, textAlign: 'center', width: '50%' }]} value={sheet.title} onChangeText={(value) => {
                    setSheet({ ...sheet, title: value });
                    sheetTitle = value;
                }} onBlur={() => {
                    saveSheet();
                }} />
                <div style={{ width: '10%' }}></div>
            </View>
            <div id="spreadsheet" style={{ height: 'calc(100vh - 100px)', width: '100vw', overflow: 'scroll' }}></div>
        </div>
    )
}