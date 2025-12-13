namespace WorshipPad
{
    /// <summary>
    /// Serviço responsável por gerenciar caminhos e validação de arquivos de áudio do WorshipPad.
    /// Fornece métodos para obter caminhos completos de arquivos MP3 e verificar sua existência.
    /// </summary>
    public class WorshipPadService
    {
        /// <summary>
        /// Caminho base onde os arquivos de áudio (pads) estão armazenados.
        /// </summary>
        private readonly string basePath = @"Pads\Shimmer\";

        /// <summary>
        /// Obtém o caminho completo do arquivo de áudio correspondente a uma chave musical.
        /// </summary>
        /// <param name="key">Chave musical no formato: C, C#, Cm, C#m.</param>
        /// <returns>Caminho completo do arquivo MP3 correspondente à chave.</returns>
        public string GetAudioFilePath(string key)
        {
            return Path.Combine(basePath, key + ".mp3");
        }

        /// <summary>
        /// Verifica se o arquivo de áudio correspondente a uma chave musical existe no sistema de arquivos.
        /// </summary>
        /// <param name="key">Chave musical no formato: C, C#, Cm, C#m.</param>
        /// <returns>True se o arquivo existe, False caso contrário.</returns>
        public bool FileExists(string key)
        {
            string path = GetAudioFilePath(key);
            return File.Exists(path);
        }
    }
}


