using NAudio.Wave;

/// <summary>
/// Classe que implementa um stream de áudio com loop infinito, continuamente, sem interrupções, reiniciando automaticamente quando chega ao fim.
public class LoopStream : WaveStream
{
    /// Stream de origem que contém os dados de áudio a serem reproduzidos em loop.
    private readonly WaveStream sourceStream;

    public LoopStream(WaveStream sourceStream)
    {
        this.sourceStream = sourceStream;
    }
    /// Obtém o formato de onda do stream de origem. Retorna as propriedades de áudio como taxa de amostragem, canais e bits por amostra.
    public override WaveFormat WaveFormat => sourceStream.WaveFormat;

    /// Obtém o comprimento do stream. Retorna long.MaxValue para indicar que o stream é infinito (loop contínuo).
    public override long Length => long.MaxValue;

    /// Obtém ou define a posição atual no stream de áudio. A posição é relativa ao stream de origem, não ao loop completo.
    public override long Position
    {
        get => sourceStream.Position;
        set => sourceStream.Position = value;
    }

    /// Lê dados do stream de áudio para o buffer fornecido. Quando o fim do arquivo é atingido (read == 0), reinicia automaticamente
    /// a reprodução do início do arquivo sem fade-in ou pausa.
    public override int Read(byte[] buffer, int offset, int count)
    {
        // Lê dados do stream de origem
        int read = sourceStream.Read(buffer, offset, count);

        // Se não há mais dados para ler (fim do arquivo), reinicia do início
        if (read == 0)
        {
            // Reposiciona o stream no início do arquivo
            sourceStream.Position = 0;
            // Lê novamente a partir do início para preencher o buffer
            read = sourceStream.Read(buffer, offset, count);
        }

        return read;
    }

    protected override void Dispose(bool disposing)
    {
        if (disposing)
        {
            // Libera o stream de origem se não for nulo
            sourceStream?.Dispose();
        }
        base.Dispose(disposing);
    }
}
