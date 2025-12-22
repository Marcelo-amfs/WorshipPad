namespace WorshipPad
{
    /// Serviço responsável por gerenciar caminhos e validação de arquivos de áudio
    public class WorshipPadService
    {
        /// Caminho base onde os arquivos de áudio (pads) estão armazenados.
        private readonly string basePath = @"Pads\Shimmer\";

        /// Obtém o caminho completo do arquivo de áudio correspondente a uma chave musical.
        public string GetAudioFilePath(string key)
        {
            // Substitui '#' por 's' no nome do arquivo (ex: C# → Cs, F#m → Fsm)
            string fileName = key.Replace("#", "s");
            return Path.Combine(basePath, fileName + ".mp3");
        }
        /// Verifica se o arquivo de áudio correspondente a uma chave musical existe no sistema de arquivos.
        public bool FileExists(string key)
        {
            string path = GetAudioFilePath(key);
            return File.Exists(path);
        }
    }
}