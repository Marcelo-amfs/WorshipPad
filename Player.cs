using NAudio.Wave;

/// Classe responsável por gerenciar a reprodução de arquivos de áudio com loop infinito.
/// Utiliza a biblioteca NAudio para processamento de áudio.
public class AudioPlayer
{
    /// Dispositivo de saída de áudio utilizado para reproduzir o stream.
    private WaveOutEvent? output;

    /// Leitor de arquivo de áudio que carrega e decodifica o arquivo MP3.
    private AudioFileReader? reader;
    
    /// Stream com loop infinito que permite reprodução contínua do áudio.
    private LoopStream? looper;

    /// Volume atual do player (0.0 a 1.0).
    public float Volume { get; private set; } = 1.0f;
    
    /// Indica se o áudio está atualmente sendo reproduzido.
    public bool IsPlaying => output != null && output.PlaybackState == PlaybackState.Playing;

    /// Inicia a reprodução de um arquivo de áudio com opção de fade-in suave.
    public async Task Play(string file, bool fadeIn = true, int fadeDurationMs = 1500)
    {
        Stop();

        reader = new AudioFileReader(file);
        looper = new LoopStream(reader);
        output = new WaveOutEvent();

        reader.Volume = fadeIn ? 0f : Volume;

        output.Init(looper);
        output.Play();

        if (fadeIn)
            await FadeIn(fadeDurationMs);
    }

    /// <summary>
    /// Aplica fade-in gradual no volume do áudio, aumentando de 0 até o volume máximo.
    /// </summary>
    /// <param name="durationMs">Duração total do fade-in em milissegundos.</param>
    public async Task FadeIn(int durationMs)
    {
        float step = 0.05f;
        int delay = durationMs / (int)(1f / step);

        for (float v = 0; v <= 1f; v += step)
        {
            if (reader != null) reader.Volume = v;
            await Task.Delay(delay);
        }

        if (reader != null) reader.Volume = 1f;
    }

    /// <summary>
    /// Aplica fade-out gradual no volume do áudio, diminuindo do volume atual até 0.
    /// Após o fade-out, para a reprodução automaticamente.
    /// </summary>
    /// <param name="durationMs">Duração total do fade-out em milissegundos.</param>
    public async Task FadeOut(int durationMs)
    {
        float step = 0.05f;
        int delay = durationMs / (int)(1f / step);

        if (reader != null)
        {
            for (float v = reader.Volume; v >= 0f; v -= step)
            {
                reader.Volume = v;
                await Task.Delay(delay);
            }

            reader.Volume = 0f;
        }
        Stop();
    }

    /// <summary>
    /// Para a reprodução de áudio e libera todos os recursos utilizados.
    /// Desconecta e descarta o output, looper e reader.
    /// </summary>
    public void Stop()
    {
        if (output != null)
        {
            output.Stop();
            output.Dispose();
            output = null;
        }

        if (looper != null)
        {
            looper.Dispose();
            looper = null;
        }

        if (reader != null)
        {
            reader.Dispose();
            reader = null;
        }
    }
}