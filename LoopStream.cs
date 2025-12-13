using NAudio.Wave;

/// <summary>
/// Classe que implementa um stream de áudio com loop infinito.
/// Herda de WaveStream e permite que um arquivo de áudio seja reproduzido
/// continuamente sem interrupções, reiniciando automaticamente quando chega ao fim.
/// </summary>
public class LoopStream : WaveStream
{
    /// <summary>
    /// Stream de origem que contém os dados de áudio a serem reproduzidos em loop.
    /// </summary>
    private readonly WaveStream sourceStream;

    /// <summary>
    /// Construtor da classe LoopStream.
    /// </summary>
    /// <param name="sourceStream">O stream de áudio que será reproduzido em loop infinito.</param>
    public LoopStream(WaveStream sourceStream)
    {
        this.sourceStream = sourceStream;
    }

    /// <summary>
    /// Obtém o formato de onda do stream de origem.
    /// Retorna as propriedades de áudio como taxa de amostragem, canais e bits por amostra.
    /// </summary>
    public override WaveFormat WaveFormat => sourceStream.WaveFormat;

    /// <summary>
    /// Obtém o comprimento do stream.
    /// Retorna long.MaxValue para indicar que o stream é infinito (loop contínuo).
    /// </summary>
    public override long Length => long.MaxValue;

    /// <summary>
    /// Obtém ou define a posição atual no stream de áudio.
    /// A posição é relativa ao stream de origem, não ao loop completo.
    /// </summary>
    public override long Position
    {
        get => sourceStream.Position;
        set => sourceStream.Position = value;
    }

    /// <summary>
    /// Lê dados do stream de áudio para o buffer fornecido.
    /// Quando o fim do arquivo é atingido (read == 0), reinicia automaticamente
    /// a reprodução do início do arquivo sem fade-in ou pausa.
    /// </summary>
    /// <param name="buffer">Buffer de bytes onde os dados de áudio serão armazenados.</param>
    /// <param name="offset">Deslocamento no buffer onde começar a escrever os dados.</param>
    /// <param name="count">Número máximo de bytes a serem lidos.</param>
    /// <returns>O número de bytes realmente lidos e escritos no buffer.</returns>
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

    /// <summary>
    /// Libera os recursos utilizados pelo LoopStream.
    /// Dispose padrão que libera o stream de origem se estiver sendo descartado.
    /// </summary>
    /// <param name="disposing">Indica se o método está sendo chamado explicitamente (true) ou pelo finalizador (false).</param>
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
