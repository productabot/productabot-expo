import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image, TextInput, Platform, Keyboard, KeyboardAvoidingView } from 'react-native';
import { Auth } from "@aws-amplify/auth";
import LogoSvg from "../svgs/logo";
import { InputAccessoryViewComponent } from '../components/InputAccessoryViewComponent';
import * as root from '../Root';

export default function ResetScreen({ route, navigation, setLoading }: any) {
    const [state, setState] = useState({
        email: '', errorMessage: ''
    });
    const reset = async () => {
        Keyboard.dismiss();
        if (state.email.length === 0) {
            setState({ ...state, errorMessage: 'Please enter an email address' });
        }
        else {
            setLoading(true);
            try {
                let response = await Auth.forgotPassword(state.email);
                console.log(response);
                setLoading(false);
                navigation.navigate('login', { reset: true });
            }
            catch (err) {
                console.log(err);
                setLoading(false);
                setState({ ...state, errorMessage: JSON.stringify(err.message) });
            }

        }
    }

    return (
        <View style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={[styles.container, { width: '100%', height: '100%' }]}
                keyboardVerticalOffset={-200}
            >
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                    <LogoSvg width={s(50, 0.85)} height={s(50, 0.85)} style={{ marginRight: 10, borderWidth: 1, borderColor: '#ffffff', borderRadius: 10, borderStyle: 'solid' }} />
                    <Text style={[styles.baseText, { fontSize: s(50, 0.85) }]}>productabot</Text>
                </TouchableOpacity>

                <View style={{ margin: 30, marginBottom: 0, maxWidth: 280 }}>
                    <Text style={[styles.baseText]}>{`NOTE: This app uses end-to-end encryption.\n\nIf you reset your password, you will lose access to all encrypted data (documents and notes).\n\nThere's no limit to password guesses. I highly encourage you to try remembering your password. Once inside the app, you can safely reset your password to something more memorable, and keep access to your encrypted data.\n\nIf you cannot remember your password, you can reset your password below and access unencrypted data (projects, tasks, entries, etc).`}</Text>
                </View>
                <View style={{ margin: 30 }}>
                    {state.errorMessage.length > 0 && <Text style={[styles.baseText, { color: '#cc0000', textAlign: 'center', marginTop: -16 }]}>{state.errorMessage}</Text>}
                    <TextInput spellCheck={false} inputAccessoryViewID='main' onChangeText={value => { setState({ ...state, email: value }); }} placeholder='email' style={[styles.textInput, isWeb && { outlineWidth: 0 }]} keyboardType='email-address' onSubmitEditing={reset} />
                </View>
                <TouchableOpacity style={[styles.touchableOpacity, { backgroundColor: '#3F91A1' }]} onPress={reset}>
                    <Text style={[styles.baseText, styles.buttonText]}>reset password</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.touchableOpacity, { backgroundColor: '#000000' }]}
                    onPress={() => { navigation.navigate('login') }}>
                    <Text style={[styles.baseText, styles.buttonText]}>go back</Text>
                </TouchableOpacity>
            </KeyboardAvoidingView>
            <InputAccessoryViewComponent />
        </View>
    );
}
const isWeb = Platform.OS === 'web';
function s(number: number, factor = 0.6) {
    return isWeb ? number * factor : number;
}
const styles = StyleSheet.create({
    container: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center'
    },
    baseText: {
        fontFamily: 'Arial',
        color: '#ffffff'
    },
    touchableOpacity: {
        backgroundColor: '#3F0054',
        padding: s(10),
        width: 275,
        alignItems: 'center',
        margin: s(10)
    },
    buttonText: {
        fontSize: s(30)
    },
    textInput: {
        fontSize: s(30),
        width: 275,
        borderBottomColor: '#ffffff',
        borderBottomWidth: 1,
        color: '#ffffff',
        margin: s(10)
    },
});
