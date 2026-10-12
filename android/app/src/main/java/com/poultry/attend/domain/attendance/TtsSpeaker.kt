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
                PunchType.ENTRY, PunchType.MORNING_IN, PunchType.LUNCH_IN -> "నమస్కారం $name, మీ ఎంట్రీ నమోదయింది"
                PunchType.EXIT, PunchType.LUNCH_OUT, PunchType.EVENING_OUT -> "ధన్యవాదాలు $name, మీ ఎగ్జిట్ నమోదయింది"
            }
        } else {
            when (punchType) {
                PunchType.ENTRY, PunchType.MORNING_IN, PunchType.LUNCH_IN -> "Namaskaram $name, entry recorded at $time"
                PunchType.EXIT, PunchType.LUNCH_OUT, PunchType.EVENING_OUT -> "Dhanyavadalu $name, exit recorded at $time"
            }
        }
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "punch")
    }

    fun speakCooldown(name: String, remainingMinutes: Int) {
        if (!isReady) return
        val text = if (isTelugu) {
            "$name, ఇప్పటికే పంచ్ నమోదయింది. దయచేసి $remainingMinutes నిమిషాలు వేచి ఉండండి"
        } else {
            "$name, punch already recorded. Please wait $remainingMinutes minutes before next punch"
        }
        tts?.speak(text, TextToSpeech.QUEUE_FLUSH, null, "cooldown")
    }

    fun speakAlreadyPunched(name: String, punchType: PunchType, time: String) {
        if (!isReady) return
        val text = if (isTelugu) {
            "$name, మీ హాజరు ఇప్పటికే నమోదయింది"
        } else {
            "$name, attendance already recorded at $time"
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
