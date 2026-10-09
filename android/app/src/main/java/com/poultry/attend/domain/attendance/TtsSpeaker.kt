package com.poultry.attend.domain.attendance

import android.content.Context
import android.media.AudioManager
import android.media.ToneGenerator
import android.speech.tts.TextToSpeech
import java.util.Locale

class TtsSpeaker(context: Context) : TextToSpeech.OnInitListener {

    private var tts: TextToSpeech? = TextToSpeech(context.applicationContext, this)
    private var isReady = false
    private var isTelugu = false
    private val toneGen = ToneGenerator(AudioManager.STREAM_MUSIC, 100)

    override fun onInit(status: Int) {
        if (status == TextToSpeech.SUCCESS) {
            val teLocale = Locale("te", "IN")
            val result = tts?.setLanguage(teLocale)
            if (result == TextToSpeech.LANG_AVAILABLE || result == TextToSpeech.LANG_COUNTRY_AVAILABLE) {
                tts?.setLanguage(teLocale)
                isTelugu = true
            } else {
                val teGeneric = Locale("te")
                val resGen = tts?.setLanguage(teGeneric)
                if (resGen == TextToSpeech.LANG_AVAILABLE || resGen == TextToSpeech.LANG_COUNTRY_AVAILABLE) {
                    tts?.setLanguage(teGeneric)
                    isTelugu = true
                } else {
                    tts?.setLanguage(Locale("en", "IN"))
                    isTelugu = false
                }
            }
            tts?.setSpeechRate(0.95f) // Slightly relaxed pace for crystal clear comprehension on farm floor
            isReady = true
        }
    }

    fun playSuccessBeep() {
        try {
            toneGen.startTone(ToneGenerator.TONE_PROP_BEEP, 150)
        } catch (e: Exception) {
            // Ignored
        }
    }

    fun speakPunch(name: String, punchType: PunchType, time: String) {
        playSuccessBeep()
        if (!isReady) return
        val text = if (isTelugu) {
            when (punchType) {
                PunchType.MORNING_IN -> "నమస్కారం $name, మీ మార్నింగ్ ఎంట్రీ నమోదయింది"
                PunchType.LUNCH_OUT -> "ధన్యవాదాలు $name, మీ లంచ్ బ్రేక్ ఎగ్జిట్ నమోదయింది"
                PunchType.LUNCH_IN -> "స్వాగతం $name, మీ మధ్యాహ్నం ఎంట్రీ నమోదయింది"
                PunchType.EVENING_OUT -> "ధన్యవాదాలు $name, మీ డ్యూటీ పూర్తయింది, ఎగ్జిట్ నమోదయింది"
            }
        } else {
            when (punchType) {
                PunchType.MORNING_IN -> "Namaskaram $name, morning entry recorded at $time"
                PunchType.LUNCH_OUT -> "Dhanyavadalu $name, lunch exit recorded at $time"
                PunchType.LUNCH_IN -> "Swagatham $name, afternoon entry recorded at $time"
                PunchType.EVENING_OUT -> "Dhanyavadalu $name, evening exit recorded at $time"
            }
        }
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "punch")
    }

    fun speakAlreadyPunched(name: String, punchType: PunchType, time: String) {
        if (!isReady) return
        val text = if (isTelugu) {
            "$name, మీ హాజరు ఇప్పటికే నమోదయింది"
        } else {
            "$name, attendance already recorded for this shift at $time"
        }
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "already_punched")
    }

    fun speakCheckIn(name: String, time: String) {
        playSuccessBeep()
        if (!isReady) return
        val text = if (isTelugu) "నమస్కారం $name, మీ ఎంట్రీ నమోదయింది" else "Welcome $name, checked in at $time"
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "check_in")
    }

    fun speakCheckOut(name: String, totalHours: String) {
        playSuccessBeep()
        if (!isReady) return
        val text = if (isTelugu) "ధన్యవాదాలు $name, మీ ఎగ్జిట్ నమోదయింది" else "Thank you $name, checked out"
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "check_out")
    }

    fun speakGuidance(message: String) {
        if (!isReady) return
        tts?.speak(message, TextToSpeech.QUEUE_FLUSH, null, "guidance")
    }

    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        toneGen.release()
    }
}
